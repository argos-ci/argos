import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { deleteBuildComment } from "@/comment/deleteBuildComment";
import { getCommentPermissions } from "@/comment/permissions";
import { boom } from "@/util/error";

import { getBuildComment, loadBuildForUserAuth } from "../auth/build";
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

export const deleteCommentOperation = {
  operationId: "deleteComment",
  summary: "Delete a comment on a build",
  description:
    "Delete a comment on a build. Only the comment's author can delete it.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
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
      description: "Comment deleted successfully — returns the comment",
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

export const deleteComment: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      const { params } = req.ctx;
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        params,
      );

      const comment = await getBuildComment({
        commentId: params.commentId,
        buildId: build.id,
      });

      const permissions = getCommentPermissions(comment, auth.user);
      if (!permissions.includes("delete")) {
        throw boom(403, "You do not have permission to delete this comment");
      }

      const deleted = await deleteBuildComment({ comment });

      res.send(await serializeComment(deleted));
    },
  );
};
