import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { Build, Comment, Project } from "@/database/models";
import {
  autoSubscribeUserToBuild,
  getBuildSubscribedUserIds,
} from "@/database/services/build-notification-subscription";
import {
  getCommentThreadSubscribedUserIds,
  subscribeUserToCommentThread,
} from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import {
  getCommentNotificationData,
  notifyMentionedUsers,
} from "./commentNotifications";
import { syncCommentMentions } from "./mentions";
import {
  isCommentEmpty,
  isCommentTooLarge,
  validateCommentJson,
} from "./validate";

/**
 * Post a standalone comment on a build (one that is not attached to a review),
 * auto-subscribe the author to the build and notify the other subscribers.
 */
export async function createBuildComment(input: {
  build: Build;
  userId: string;
  body: JSONContent;
  threadId?: string | null;
}): Promise<Comment> {
  const { build, userId, body, threadId = null } = input;

  if (!validateCommentJson(body)) {
    throw boom(400, "Invalid comment body");
  }

  if (isCommentEmpty(body)) {
    throw boom(400, "Comment cannot be empty");
  }

  if (isCommentTooLarge(body)) {
    throw boom(400, "Comment is too large");
  }

  const comment = await Comment.query().insert({
    userId,
    buildId: build.id,
    threadId,
    content: body,
  });

  const project = await build
    .$relatedQuery("project")
    .withGraphFetched("account");
  invariant(project?.account, "Build project account not found");

  // Persist the user mentions found in the comment and resolve them to the
  // users that may actually be notified (members of the project's team).
  const mentionedUserIds = await syncCommentMentions({ comment, project });

  if (threadId) {
    await Promise.all([
      subscribeUserToCommentThread({ commentId: threadId, userId }),
      notifyCommentThreadSubscribers({
        build,
        project,
        comment,
        userId,
        body,
        threadId,
        // Mentioned users get a dedicated notification, don't double-notify.
        excludeUserIds: mentionedUserIds,
      }),
    ]);
  } else {
    await Promise.all([
      autoSubscribeUserToBuild({ buildId: build.id, userId }),
      subscribeUserToCommentThread({ commentId: comment.id, userId }),
      notifyBuildSubscribers({
        build,
        project,
        comment,
        userId,
        body,
        excludeUserIds: mentionedUserIds,
      }),
    ]);
  }

  await notifyMentionedUsers({
    build,
    project,
    comment,
    userId,
    body,
    mentionedUserIds,
    threadId: threadId ?? comment.id,
  });

  return comment;
}

async function notifyBuildSubscribers(input: {
  build: Build;
  project: Project;
  comment: Comment;
  userId: string;
  body: JSONContent;
  excludeUserIds: string[];
}): Promise<void> {
  const { build, project, comment, userId, body, excludeUserIds } = input;
  const subscribedUserIds = await getBuildSubscribedUserIds(build.id);
  const excluded = new Set([userId, ...excludeUserIds]);
  const recipients = subscribedUserIds.filter((id) => !excluded.has(id));
  if (recipients.length === 0) {
    return;
  }
  const data = await getCommentNotificationData({
    build,
    project,
    comment,
    userId,
    body,
  });
  await sendNotification({ type: "comment_added", data, recipients });
}

async function notifyCommentThreadSubscribers(input: {
  build: Build;
  project: Project;
  comment: Comment;
  userId: string;
  body: JSONContent;
  threadId: string;
  excludeUserIds: string[];
}): Promise<void> {
  const { build, project, comment, userId, body, threadId, excludeUserIds } =
    input;
  const subscribedUserIds = await getCommentThreadSubscribedUserIds(threadId);
  const excluded = new Set([userId, ...excludeUserIds]);
  const recipients = subscribedUserIds.filter((id) => !excluded.has(id));
  if (recipients.length === 0) {
    return;
  }
  const data = await getCommentNotificationData({
    build,
    project,
    comment,
    userId,
    body,
  });
  await sendNotification({ type: "comment_replied", data, recipients });
}
