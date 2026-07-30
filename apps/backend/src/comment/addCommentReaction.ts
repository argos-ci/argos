import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";
import { Comment, User } from "@/database/models";
import { getCommentThreadSubscribedUserIds } from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";
import { getCommentRecipients } from "./commentNotifications";
import { getCommentUrl } from "./id";
import { renderCommentHtmlWithMentions } from "./mentions";
import { isValidEmoji } from "./reactions";
import {
  getCommentTargetNotificationFields,
  getCommentTargetProject,
  resolveCommentTarget,
} from "./target";

/**
 * Add an emoji reaction from a user to a comment and notify the comment thread
 * subscribers. The operation is idempotent: reacting again with the same emoji
 * is a no-op.
 */
export async function addCommentReaction(input: {
  comment: Comment;
  userId: string;
  emoji: string;
}): Promise<Comment> {
  const { comment, userId, emoji } = input;

  if (!isValidEmoji(emoji)) {
    throw boom(400, "Invalid emoji");
  }

  // Insert atomically: `onConflict().ignore()` makes concurrent requests safe
  // (no read-then-insert race, no primary-key violation) and the returning rows
  // tell us whether this call actually created the reaction. `createdAt` and
  // `updatedAt` fall back to their database defaults.
  const inserted = await knex("comment_reactions")
    .insert({ commentId: comment.id, userId, emoji })
    .onConflict(["commentId", "userId", "emoji"])
    .ignore()
    .returning("commentId");

  // Already reacted with this emoji: nothing inserted, nothing to notify.
  if (inserted.length === 0) {
    return comment;
  }

  await notifyCommentThreadSubscribers({ comment, userId, emoji });

  // Notify clients watching this target so the reaction appears live. The
  // comment row is unchanged; subscribers re-resolve its `reactions` field.
  await publishCommentChange({ type: "UPDATED", comment });

  return comment;
}

/**
 * Notify everyone subscribed to the reacted-to comment's thread. The reactor is
 * never notified of their own reaction.
 */
async function notifyCommentThreadSubscribers(input: {
  comment: Comment;
  userId: string;
  emoji: string;
}): Promise<void> {
  const { comment, userId, emoji } = input;

  // A standalone comment is its own thread root; a reply points at the root
  // via `threadId`. Subscriptions are keyed on the root comment.
  const threadId = comment.threadId ?? comment.id;
  const subscribedUserIds = await getCommentThreadSubscribedUserIds(threadId);
  // Cheap pre-check: a thread nobody but the reactor follows costs no further
  // queries. Narrowing to who may still read the comment needs the project, so
  // it happens once the target is resolved below.
  if (subscribedUserIds.every((id) => id === userId)) {
    return;
  }

  const target = await resolveCommentTarget(comment);
  const project = await getCommentTargetProject(target);
  invariant(project.account, "project account not found");

  const recipients = await getCommentRecipients({
    project,
    userIds: subscribedUserIds,
    excludeUserIds: [userId],
  });
  if (recipients.length === 0) {
    return;
  }

  const [reactor, commentUrl] = await Promise.all([
    User.query().findById(userId).withGraphFetched("account"),
    getCommentUrl({ target, comment }),
  ]);

  const reactorName = reactor?.account?.displayName ?? null;

  await sendNotification({
    type: "comment_reaction",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      ...getCommentTargetNotificationFields(target),
      commentUrl,
      commentAuthorId: comment.userId,
      reactorName,
      emoji,
      bodyHtml: await renderCommentHtmlWithMentions(comment),
    },
    recipients,
  });
}
