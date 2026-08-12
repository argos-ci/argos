import { invariant } from "@argos/util/invariant";

import { Build, BuildReview, Comment, Project, User } from "@/database/models";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";
import { getProjectMemberIds } from "@/project/members";

import { publishCommentChange } from "./commentEvents";
import { getCommentUrl } from "./id";
import {
  getCommentMentionedUserIds,
  renderCommentHtmlWithMentions,
} from "./mentions";
import {
  getCommentTargetNotificationFields,
  type CommentTarget,
} from "./target";

/**
 * Narrow a list of candidate recipients to the users who may still read the
 * comment they would be told about, dropping `excludeUserIds` (the author, and
 * anyone already covered by a more specific notification) on the way.
 *
 * A subscription outlives the access that created it: the rows in
 * `comment_notifications_subscriptions` and `{build,test}_notification_subscriptions`
 * survive a user leaving the team and a project turning private, and a test is
 * followed for as long as the test exists rather than for the life of one build.
 * Since these emails embed the rendered comment body, the project's *current*
 * members are the authority on who may receive one — not who once asked to be
 * told.
 */
export async function getCommentRecipients(input: {
  project: Project;
  userIds: string[];
  excludeUserIds?: string[];
}): Promise<string[]> {
  const { project, userIds, excludeUserIds = [] } = input;
  const excluded = new Set(excludeUserIds);
  const candidates = userIds.filter((id) => !excluded.has(id));
  // Nobody left to notify: skip the membership lookup entirely.
  if (candidates.length === 0) {
    return [];
  }
  const memberIds = new Set(await getProjectMemberIds(project));
  return candidates.filter((id) => memberIds.has(id));
}

/**
 * Build the data shared by every comment notification email (what the comment
 * was posted on, its author's name and the URL pointing at it).
 */
export async function getCommentNotificationData(input: {
  target: CommentTarget;
  project: Project;
  comment: Comment;
  userId: string;
}) {
  const { target, project, comment, userId } = input;
  invariant(project.account, "Project account not found");
  const [author, commentUrl, bodyHtml] = await Promise.all([
    User.query().findById(userId).withGraphFetched("account"),
    getCommentUrl({ target, comment }),
    renderCommentHtmlWithMentions(comment, { project }),
  ]);
  return {
    accountSlug: project.account.slug,
    projectName: project.name,
    ...getCommentTargetNotificationFields(target),
    commentUrl,
    authorName: author?.account?.displayName ?? null,
    bodyHtml,
  };
}

/**
 * Notify the users mentioned in a comment and subscribe them to the thread, so
 * they keep receiving replies even though they hadn't commented yet. Mentioned
 * users are notified regardless of their existing subscription state.
 */
export async function notifyMentionedUsers(input: {
  target: CommentTarget;
  project: Project;
  comment: Comment;
  userId: string;
  mentionedUserIds: string[];
  threadId: string;
}): Promise<void> {
  const { target, project, comment, userId, mentionedUserIds, threadId } =
    input;
  // Mentions are validated against the project's members when they are stored,
  // but a mention persisted months ago (and replayed here when a review goes
  // live) may name someone who has since lost access.
  const recipients = await getCommentRecipients({
    project,
    userIds: mentionedUserIds,
    excludeUserIds: [userId],
  });
  if (recipients.length === 0) {
    return;
  }
  // Subscribe every mentioned user to the thread (idempotent).
  await Promise.all(
    recipients.map((mentionedUserId) =>
      subscribeUserToCommentThread({
        commentId: threadId,
        userId: mentionedUserId,
      }),
    ),
  );
  const data = await getCommentNotificationData({
    target,
    project,
    comment,
    userId,
  });
  await sendNotification({ type: "comment_mention", data, recipients });
}

/**
 * Called when a review leaves the `pending` state: its draft comments become
 * visible to everyone. Broadcast each comment so other clients' activity feeds
 * populate, and send the mention notifications that were deferred while the
 * comments were drafts. We deliberately do NOT send `comment_added` here — the
 * review submission notification already covers the build subscribers.
 */
export async function notifyReviewCommentsWentLive(input: {
  build: Build;
  project: Project;
  review: BuildReview;
}): Promise<void> {
  const { build, project, review } = input;
  const comments = await review
    .$relatedQuery("comments")
    .whereNull("deletedAt")
    .orderBy("createdAt", "asc");
  if (comments.length === 0) {
    return;
  }
  const target: CommentTarget = { type: "build", build };
  await Promise.all(
    comments.map(async (comment) => {
      invariant(comment.userId, "comment should have a userId");
      const mentionedUserIds = await getCommentMentionedUserIds(comment.id);
      await Promise.all([
        publishCommentChange({ type: "ADDED", comment }),
        notifyMentionedUsers({
          target,
          project,
          comment,
          userId: comment.userId,
          mentionedUserIds,
          threadId: comment.threadId ?? comment.id,
        }),
      ]);
    }),
  );
}
