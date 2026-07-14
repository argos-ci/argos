import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { resolveCommentBody } from "@/comment/body";
import { getCommentPermissions } from "@/comment/permissions";
import { updateBuildComment } from "@/comment/updateBuildComment";
import { boom } from "@/util/error";

import { getBuildComment, loadBuildForPatAuth } from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import {
  CommentBodyInputSchema,
  CommentSchema,
  serializeComment,
} from "../schema/primitives/comment";
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

const UpdateCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
});

export const updateCommentOperation = {
  operationId: "updateComment",
  summary: "Update a comment on a build",
  description:
    "Update the body of a comment on a build. Only the comment's author can edit it.",
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
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: UpdateCommentBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Comment updated successfully — returns the comment",
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

export const updateComment: CreateAPIHandler = ({ patch }) => {
  patch(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      const { params, body: input } = req.ctx;
      const { auth, build } = await loadBuildForPatAuth(req.ctx.auth(), params);

      const comment = await getBuildComment({
        commentId: params.commentId,
        buildId: build.id,
      });

      const permissions = getCommentPermissions(comment, auth.user);
      if (!permissions.includes("edit")) {
        throw boom(403, "You do not have permission to edit this comment");
      }

      const updated = await updateBuildComment({
        comment,
        body: await resolveCommentBody(input.body),
      });

      res.send(await serializeComment(updated));
    },
  );
};
