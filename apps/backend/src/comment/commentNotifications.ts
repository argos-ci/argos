import { invariant } from "@argos/util/invariant";

import { Build, Comment, Project, User } from "@/database/models";
import { subscribeUserToCommentThread } from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";

import { formatCommentId } from "./id";
import { renderCommentHtmlWithMentions } from "./mentions";

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
  const [author, buildUrl, bodyHtml] = await Promise.all([
    User.query().findById(userId).withGraphFetched("account"),
    build.getUrl(),
    renderCommentHtmlWithMentions(comment),
  ]);
  const commentUrl = `${buildUrl}#${formatCommentId(comment.id)}`;
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
