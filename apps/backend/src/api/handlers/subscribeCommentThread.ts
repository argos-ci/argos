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
import { CommentSchema, serializeComment } from "../schema/primitives/comment";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const CommentId = z
  .string()
  .meta({ description: "ID of any comment in the thread" });

const BuildPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
  commentId: CommentId,
});

const TestPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  testId: TestId,
  commentId: CommentId,
});

const errorResponses = {
  "400": invalidParameters,
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
  "500": serverError,
};

const subscribedResponses = {
  "200": {
    description: "Subscribed — returns the root comment",
    content: {
      "application/json": {
        schema: CommentSchema,
      },
    },
  },
  ...errorResponses,
};

const unsubscribedResponses = {
  "200": {
    description: "Unsubscribed — returns the root comment",
    content: {
      "application/json": {
        schema: CommentSchema,
      },
    },
  },
  ...errorResponses,
};

export const subscribeBuildCommentThreadOperation = {
  operationId: "subscribeBuildCommentThread",
  summary: "Subscribe to a build comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread on a build to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: subscribedResponses,
} satisfies ZodOpenApiOperationObject;

export const unsubscribeBuildCommentThreadOperation = {
  operationId: "unsubscribeBuildCommentThread",
  summary: "Unsubscribe from a build comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a build comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: unsubscribedResponses,
} satisfies ZodOpenApiOperationObject;

export const subscribeTestCommentThreadOperation = {
  operationId: "subscribeTestCommentThread",
  summary: "Subscribe to a test comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread on a test to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: subscribedResponses,
} satisfies ZodOpenApiOperationObject;

export const unsubscribeTestCommentThreadOperation = {
  operationId: "unsubscribeTestCommentThread",
  summary: "Unsubscribe from a test comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a test comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: unsubscribedResponses,
} satisfies ZodOpenApiOperationObject;

/**
 * Subscribe to or unsubscribe from a thread, shared by the build- and
 * test-scoped endpoints.
 */
async function setTargetThreadSubscription(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  subscribed: boolean;
}): Promise<z.infer<typeof CommentSchema>> {
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
};
