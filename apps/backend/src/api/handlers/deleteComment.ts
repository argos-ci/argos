import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { deleteComment as deleteCommentService } from "@/comment/deleteComment";
import { getCommentPermissions } from "@/comment/permissions";
import { boom } from "@/util/error";

import {
  getTargetComment,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  CommentId,
  commentResponses,
  serializeComment,
  type CommentPayload,
} from "../schema/primitives/comment";
import { MediaId } from "../schema/primitives/media";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const deleteBuildCommentOperation = {
  operationId: "deleteBuildComment",
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
      commentId: CommentId,
    }),
  },
  responses: commentResponses(
    "Comment deleted successfully — returns the comment",
  ),
} satisfies ZodOpenApiOperationObject;

export const deleteTestCommentOperation = {
  operationId: "deleteTestComment",
  summary: "Delete a comment on a test",
  description:
    "Delete a comment on a test. Only the comment's author can delete it.",
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
  responses: commentResponses(
    "Comment deleted successfully — returns the comment",
  ),
} satisfies ZodOpenApiOperationObject;

export const deleteMediaCommentOperation = {
  operationId: "deleteMediaComment",
  summary: "Delete a comment on a media",
  description:
    "Delete a comment on a media. Only the comment's author can delete it.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      mediaId: MediaId,
      commentId: CommentId,
    }),
  },
  responses: commentResponses(
    "Comment deleted successfully — returns the comment",
  ),
} satisfies ZodOpenApiOperationObject;

/** Shared by the build- and test-scoped delete endpoints. */
async function deleteTargetComment(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
}): Promise<CommentPayload> {
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  const comment = await getTargetComment({
    commentId: input.params.commentId,
    target,
  });

  const permissions = getCommentPermissions(comment, auth.user);
  if (!permissions.includes("delete")) {
    throw boom(403, "You do not have permission to delete this comment");
  }

  const deleted = await deleteCommentService({ comment });

  return serializeComment(deleted);
}

export const deleteComment: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await deleteTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );

  del(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await deleteTargetComment({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );

  del("/media/{mediaId}/comments/{commentId}", async (req, res) => {
    res.send(
      await deleteTargetComment({
        authPromise: req.ctx.auth(),
        params: req.ctx.params,
      }),
    );
  });
};
