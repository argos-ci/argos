import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { Build, Comment, User } from "@/database/models";
import {
  autoSubscribeUserToBuild,
  getBuildSubscribedUserIds,
} from "@/database/services/build-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { renderCommentHtml } from "./html";
import { isCommentEmpty, validateCommentJson } from "./validate";

/**
 * Post a standalone comment on a build (one that is not attached to a review),
 * auto-subscribe the author to the build and notify the other subscribers.
 */
export async function createBuildComment(input: {
  build: Build;
  userId: string;
  body: JSONContent;
}): Promise<Comment> {
  const { build, userId, body } = input;

  if (!validateCommentJson(body)) {
    throw boom(400, "Invalid comment body");
  }

  if (isCommentEmpty(body)) {
    throw boom(400, "Comment cannot be empty");
  }

  const comment = await Comment.query().insert({
    userId,
    buildId: build.id,
    content: body,
  });

  await Promise.all([
    autoSubscribeUserToBuild({ buildId: build.id, userId }),
    notifyBuildSubscribers({ build, userId, body }),
  ]);

  return comment;
}

async function notifyBuildSubscribers(input: {
  build: Build;
  userId: string;
  body: JSONContent;
}): Promise<void> {
  const { build, userId, body } = input;
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
  await sendNotification({
    type: "comment_added",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      authorName,
      bodyHtml: renderCommentHtml(body),
    },
    recipients,
  });
}
