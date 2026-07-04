import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  resolveCommentThread as resolveCommentThreadService,
  unresolveCommentThread as unresolveCommentThreadService,
} from "@/comment/resolveCommentThread";

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
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const PathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
  commentId: z
    .string()
    .meta({ description: "ID of any comment in the thread" }),
});

export const resolveCommentThreadOperation = {
  operationId: "resolveCommentThread",
  summary: "Mark a comment thread as resolved",
  description: "Mark a comment thread as resolved.",
  tags: ["Comments"],
  security: personalAccessTokenAuth,
  requestParams: { path: PathParams },
  responses: {
    "200": {
      description: "Thread resolved — returns the root comment",
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

export const unresolveCommentThreadOperation = {
  operationId: "unresolveCommentThread",
  summary: "Reopen a resolved comment thread",
  description: "Reopen a previously resolved comment thread.",
  tags: ["Comments"],
  security: personalAccessTokenAuth,
  requestParams: { path: PathParams },
  responses: {
    "200": {
      description: "Thread reopened — returns the root comment",
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

export const resolveCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/resolve",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You do not have permission to resolve this thread",
      });

      const thread = await getBuildCommentThread({
        commentId: params.commentId,
        buildId: build.id,
      });

      const resolved = await resolveCommentThreadService({ thread });

      res.send(await serializeComment(resolved));
    },
  );
};

export const unresolveCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/unresolve",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You do not have permission to reopen this thread",
      });

      const thread = await getBuildCommentThread({
        commentId: params.commentId,
        buildId: build.id,
      });

      const reopened = await unresolveCommentThreadService({ thread });

      res.send(await serializeComment(reopened));
    },
  );
};
