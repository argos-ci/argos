import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { Build, Comment, User } from "@/database/models";
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

import { renderCommentHtml } from "./html";
import { formatCommentId } from "./id";
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

  if (threadId) {
    await Promise.all([
      subscribeUserToCommentThread({ commentId: threadId, userId }),
      notifyCommentThreadSubscribers({
        build,
        comment,
        userId,
        body,
        threadId,
      }),
    ]);
  } else {
    await Promise.all([
      autoSubscribeUserToBuild({ buildId: build.id, userId }),
      subscribeUserToCommentThread({ commentId: comment.id, userId }),
      notifyBuildSubscribers({ build, comment, userId, body }),
    ]);
  }

  return comment;
}

async function notifyBuildSubscribers(input: {
  build: Build;
  comment: Comment;
  userId: string;
  body: JSONContent;
}): Promise<void> {
  const { build, comment, userId, body } = input;
  const subscribedUserIds = await getBuildSubscribedUserIds(build.id);
  const recipients = subscribedUserIds.filter((id) => id !== userId);
  if (recipients.length === 0) {
    return;
  }
  const [project, author, buildUrl] = await Promise.all([
    build.$relatedQuery("project").withGraphFetched("account"),
    User.query().findById(userId).withGraphFetched("account"),
    build.getUrl(),
  ]);
  invariant(project, "project not found");
  invariant(project.account, "project account not found");
  const authorName = author?.account?.displayName ?? null;
  const commentUrl = `${buildUrl}#${formatCommentId(comment.id)}`;
  await sendNotification({
    type: "comment_added",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      commentUrl,
      authorName,
      bodyHtml: renderCommentHtml(body),
    },
    recipients,
  });
}

async function notifyCommentThreadSubscribers(input: {
  build: Build;
  comment: Comment;
  userId: string;
  body: JSONContent;
  threadId: string;
}): Promise<void> {
  const { build, comment, userId, body, threadId } = input;
  const subscribedUserIds = await getCommentThreadSubscribedUserIds(threadId);
  const recipients = subscribedUserIds.filter((id) => id !== userId);
  if (recipients.length === 0) {
    return;
  }
  const [project, author, buildUrl] = await Promise.all([
    build.$relatedQuery("project").withGraphFetched("account"),
    User.query().findById(userId).withGraphFetched("account"),
    build.getUrl(),
  ]);
  invariant(project, "project not found");
  invariant(project.account, "project account not found");
  const authorName = author?.account?.displayName ?? null;
  const commentUrl = `${buildUrl}#${formatCommentId(comment.id)}`;
  await sendNotification({
    type: "comment_replied",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      commentUrl,
      authorName,
      bodyHtml: renderCommentHtml(body),
    },
    recipients,
  });
}
