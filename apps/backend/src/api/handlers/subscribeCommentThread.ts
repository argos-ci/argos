import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  subscribeUserToCommentThread,
  unsubscribeUserFromCommentThread,
} from "@/database/services/comment-notification-subscription";

import {
  assertBuildPermission,
  getBuildCommentThread,
  loadBuildForPatAuth,
} from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import { CommentSchema, serializeComment } from "../schema/primitives/comment";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const PathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
  commentId: z
    .string()
    .meta({ description: "ID of any comment in the thread" }),
});

export const subscribeCommentThreadOperation = {
  operationId: "subscribeCommentThread",
  summary: "Subscribe to a comment thread's notifications",
  description:
    "Subscribe the authenticated user to a comment thread to receive notifications about new replies.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: PathParams },
  responses: {
    "200": {
      description: "Subscribed — returns the root comment",
      content: {
        "application/json": {
          schema: CommentSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const unsubscribeCommentThreadOperation = {
  operationId: "unsubscribeCommentThread",
  summary: "Unsubscribe from a comment thread's notifications",
  description:
    "Unsubscribe the authenticated user from a comment thread's notifications.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: PathParams },
  responses: {
    "200": {
      description: "Unsubscribed — returns the root comment",
      content: {
        "application/json": {
          schema: CommentSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const subscribeCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "view",
        message: "You do not have permission to access this thread",
      });

      const thread = await getBuildCommentThread({
        commentId: params.commentId,
        buildId: build.id,
      });

      await subscribeUserToCommentThread({
        commentId: thread.id,
        userId: auth.user.id,
      });

      res.send(await serializeComment(thread));
    },
  );
};

export const unsubscribeCommentThread: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "view",
        message: "You do not have permission to access this thread",
      });

      const thread = await getBuildCommentThread({
        commentId: params.commentId,
        buildId: build.id,
      });

      await unsubscribeUserFromCommentThread({
        commentId: thread.id,
        userId: auth.user.id,
      });

      res.send(await serializeComment(thread));
    },
  );
};
