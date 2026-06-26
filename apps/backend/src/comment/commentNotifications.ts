import { invariant } from "@argos/util/invariant";

import { Build, BuildReview, Comment, Project, User } from "@/database/models";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";

import { publishCommentChange } from "./commentEvents";
import { getCommentUrl } from "./id";
import {
  getCommentMentionedUserIds,
  renderCommentHtmlWithMentions,
} from "./mentions";

/**
 * Build the data shared by every comment notification email (author name and
 * the URL pointing at the comment).
 */
export async function getCommentNotificationData(input: {
  build: Build;
  project: Project;
  comment: Comment;
  userId: string;
}) {
  const { build, project, comment, userId } = input;
  invariant(project.account, "Build project account not found");
  const [author, commentUrl, bodyHtml] = await Promise.all([
    User.query().findById(userId).withGraphFetched("account"),
    getCommentUrl({ build, comment }),
    renderCommentHtmlWithMentions(comment),
  ]);
  return {
    accountSlug: project.account.slug,
    projectName: project.name,
    buildNumber: build.number,
    buildName: build.name,
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
  build: Build;
  project: Project;
  comment: Comment;
  userId: string;
  mentionedUserIds: string[];
  threadId: string;
}): Promise<void> {
  const { build, project, comment, userId, mentionedUserIds, threadId } = input;
  const recipients = mentionedUserIds.filter((id) => id !== userId);
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
    build,
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
  await Promise.all(
    comments.map(async (comment) => {
      invariant(comment.userId, "comment should have a userId");
      const mentionedUserIds = await getCommentMentionedUserIds(comment.id);
      await Promise.all([
        publishCommentChange({ buildId: build.id, type: "ADDED", comment }),
        notifyMentionedUsers({
          build,
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
