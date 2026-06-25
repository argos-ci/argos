import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { removeCommentReaction as removeCommentReactionService } from "@/comment/removeCommentReaction";

import {
  assertBuildPermission,
  getBuildComment,
  getPatAuthAndBuild,
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
import { personalAccessTokenAuth } from "../schema/util/security";
import { CreateAPIHandler } from "../util";

export const removeCommentReactionOperation = {
  operationId: "removeCommentReaction",
  summary: "Remove an emoji reaction from a comment",
  description:
    "Remove an emoji reaction previously added by the authenticated user from a comment.",
  tags: ["Comments"],
  security: personalAccessTokenAuth,
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
      commentId: z.string().meta({ description: "The ID of the comment" }),
    }),
    query: z.object({
      emoji: z.string().meta({ description: "The emoji reaction to remove." }),
    }),
  },
  responses: {
    "200": {
      description: "Reaction removed — returns the comment",
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

export const removeCommentReaction: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
    async (req, res) => {
      const { params, query } = req.ctx;
      const { auth, build } = await getPatAuthAndBuild(req, params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "review",
        message: "You do not have permission to react to this comment",
      });

      const comment = await getBuildComment({
        commentId: params.commentId,
        buildId: build.id,
      });

      const updated = await removeCommentReactionService({
        comment,
        userId: auth.user.id,
        emoji: query.emoji,
      });

      res.send(await serializeComment(updated));
    },
  );
};
