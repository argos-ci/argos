import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { knex } from "@/database";
import { Comment, User } from "@/database/models";
import { getCommentThreadSubscribedUserIds } from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { renderCommentHtml } from "./html";
import { formatCommentId } from "./id";
import { isValidEmoji } from "./reactions";

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
  const recipients = subscribedUserIds.filter((id) => id !== userId);
  if (recipients.length === 0) {
    return;
  }

  const build = await comment
    .$relatedQuery("build")
    .withGraphFetched("project.account");
  invariant(build, "build not found");
  invariant(build.project, "project not found");
  invariant(build.project.account, "project account not found");

  const [reactor, buildUrl] = await Promise.all([
    User.query().findById(userId).withGraphFetched("account"),
    build.getUrl(),
  ]);

  const reactorName = reactor?.account?.displayName ?? null;
  const commentUrl = `${buildUrl}#${formatCommentId(comment.id)}`;

  await sendNotification({
    type: "comment_reaction",
    data: {
      accountSlug: build.project.account.slug,
      projectName: build.project.name,
      buildNumber: build.number,
      buildName: build.name,
      commentUrl,
      commentAuthorId: comment.userId,
      reactorName,
      emoji,
      bodyHtml: renderCommentHtml(comment.content as JSONContent),
    },
    recipients,
  });
}
