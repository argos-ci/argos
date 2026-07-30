import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { resolveCommentBody } from "@/comment/body";
import { getCommentPermissions } from "@/comment/permissions";
import { updateComment as updateCommentService } from "@/comment/updateComment";
import { boom } from "@/util/error";

import {
  getTargetComment,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  CommentBodyInputSchema,
  CommentSchema,
  serializeComment,
} from "../schema/primitives/comment";
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

const CommentId = z.string().meta({ description: "The ID of the comment" });

const UpdateCommentBodySchema = z.object({
  body: CommentBodyInputSchema,
});

const requestBody = {
  required: true,
  content: {
    "application/json": {
      schema: UpdateCommentBodySchema,
    },
  },
};

const responses = {
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
};

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
      commentId: CommentId,
    }),
  },
  requestBody,
  responses,
} satisfies ZodOpenApiOperationObject;

export const updateTestCommentOperation = {
  operationId: "updateTestComment",
  summary: "Update a comment on a test",
  description:
    "Update the body of a comment on a test. Only the comment's author can edit it.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
      commentId: CommentId,
    }),
  },
  requestBody,
  responses,
} satisfies ZodOpenApiOperationObject;

/** Shared by the build- and test-scoped update endpoints. */
async function updateTargetComment(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  body: z.infer<typeof UpdateCommentBodySchema>;
}): Promise<z.infer<typeof CommentSchema>> {
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  const comment = await getTargetComment({
    commentId: input.params.commentId,
    target,
  });

  const permissions = getCommentPermissions(comment, auth.user);
  if (!permissions.includes("edit")) {
    throw boom(403, "You do not have permission to edit this comment");
  }

  const updated = await updateCommentService({
    comment,
    body: await resolveCommentBody(input.body.body),
  });

  return serializeComment(updated);
}

export const updateComment: CreateAPIHandler = ({ patch }) => {
  patch(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await updateTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );

  patch(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await updateTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );
};
