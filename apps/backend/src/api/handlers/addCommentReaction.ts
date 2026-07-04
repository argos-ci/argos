import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { addCommentReaction as addCommentReactionService } from "@/comment/addCommentReaction";

import {
  assertBuildPermission,
  getBuildComment,
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

const AddReactionBodySchema = z.object({
  emoji: z.string().meta({ description: "The emoji to react with." }),
});

export const addCommentReactionOperation = {
  operationId: "addCommentReaction",
  summary: "Add an emoji reaction to a comment",
  description:
    "Add an emoji reaction to a comment on behalf of the authenticated user.",
  tags: ["Comments"],
  security: personalAccessTokenAuth,
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
      commentId: z.string().meta({ description: "The ID of the comment" }),
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: AddReactionBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Reaction added — returns the comment",
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

export const addCommentReaction: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
    async (req, res) => {
      const { params, body: input } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

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

      const updated = await addCommentReactionService({
        comment,
        userId: auth.user.id,
        emoji: input.emoji,
      });

      res.send(await serializeComment(updated));
    },
  );
};
