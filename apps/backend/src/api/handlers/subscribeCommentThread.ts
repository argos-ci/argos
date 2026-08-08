import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  subscribeUserToCommentThread,
  unsubscribeUserFromCommentThread,
} from "@/database/services/comment-notification-subscription";

import {
  assertCommentTargetPermission,
  getTargetCommentThread,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  commentResponses,
  serializeComment,
  ThreadCommentId,
  type CommentPayload,
} from "../schema/primitives/comment";
import { MediaId } from "../schema/primitives/media";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const BuildPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
  commentId: ThreadCommentId,
});

const TestPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  testId: TestId,
  commentId: ThreadCommentId,
});

const MediaPathParams = z.object({
  mediaId: MediaId,
  commentId: ThreadCommentId,
});

export const subscribeBuildCommentThreadOperation = {
  operationId: "subscribeBuildCommentThread",
  summary: "Subscribe to a build comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread on a build to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: commentResponses("Subscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unsubscribeBuildCommentThreadOperation = {
  operationId: "unsubscribeBuildCommentThread",
  summary: "Unsubscribe from a build comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a build comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: commentResponses("Unsubscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const subscribeTestCommentThreadOperation = {
  operationId: "subscribeTestCommentThread",
  summary: "Subscribe to a test comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread on a test to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: commentResponses("Subscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const subscribeMediaCommentThreadOperation = {
  operationId: "subscribeMediaCommentThread",
  summary: "Subscribe to a media comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread on a media to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: MediaPathParams },
  responses: commentResponses("Subscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unsubscribeTestCommentThreadOperation = {
  operationId: "unsubscribeTestCommentThread",
  summary: "Unsubscribe from a test comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a test comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: commentResponses("Unsubscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unsubscribeMediaCommentThreadOperation = {
  operationId: "unsubscribeMediaCommentThread",
  summary: "Unsubscribe from a media comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a media comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: MediaPathParams },
  responses: commentResponses("Unsubscribed — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

/**
 * Subscribe to or unsubscribe from a thread, shared by the build- and
 * test-scoped endpoints.
 */
async function setTargetThreadSubscription(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  subscribed: boolean;
}): Promise<CommentPayload> {
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  await assertCommentTargetPermission({
    target,
    user: auth.user,
    permission: "view",
    message: "You do not have permission to access this thread",
  });

  const thread = await getTargetCommentThread({
    commentId: input.params.commentId,
    target,
  });

  if (input.subscribed) {
    await subscribeUserToCommentThread({
      commentId: thread.id,
      userId: auth.user.id,
    });
  } else {
    await unsubscribeUserFromCommentThread({
      commentId: thread.id,
      userId: auth.user.id,
    });
  }

  return serializeComment(thread);
}

export const subscribeCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: true,
        }),
      );
    },
  );

  post(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: true,
        }),
      );
    },
  );

  post(
    "/media/{mediaId}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: true,
        }),
      );
    },
  );
};

export const unsubscribeCommentThread: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: false,
        }),
      );
    },
  );

  del(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: false,
        }),
      );
    },
  );

  del(
    "/media/{mediaId}/comments/{commentId}/subscription",
    async (req, res) => {
      res.send(
        await setTargetThreadSubscription({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          subscribed: false,
        }),
      );
    },
  );
};
