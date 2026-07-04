import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { BuildReview } from "@/database/models";
import { boom } from "@/util/error";

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

export const getCommentOperation = {
  operationId: "getComment",
  summary: "Get a single comment on a build",
  description: "Retrieve a single comment on a build by its ID.",
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
  responses: {
    "200": {
      description: "Comment",
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

export const getComment: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "view",
        message: "You do not have permission to view this build",
      });

      const comment = await getBuildComment({
        commentId: params.commentId,
        buildId: build.id,
      });

      // Deleted comments are no longer visible.
      if (comment.deletedAt) {
        throw boom(404, "Comment not found");
      }

      // A draft comment on a pending review is visible only to its author.
      if (comment.buildReviewId) {
        const review = await BuildReview.query()
          .findById(comment.buildReviewId)
          .select("state", "userId");
        if (review?.state === "pending" && review.userId !== auth.user.id) {
          throw boom(404, "Comment not found");
        }
      }

      res.send(await serializeComment(comment));
    },
  );
};
