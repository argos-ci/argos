import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { BuildReview } from "@/database/models";
import { boom } from "@/util/error";

import {
  assertCommentTargetPermission,
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
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const getBuildCommentOperation = {
  operationId: "getBuildComment",
  summary: "Get a single comment on a build",
  description: "Retrieve a single comment on a build by its ID.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
      commentId: CommentId,
    }),
  },
  responses: commentResponses("Comment"),
} satisfies ZodOpenApiOperationObject;

export const getTestCommentOperation = {
  operationId: "getTestComment",
  summary: "Get a single comment on a test",
  description: "Retrieve a single comment on a test by its ID.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
      commentId: CommentId,
    }),
  },
  responses: commentResponses("Comment"),
} satisfies ZodOpenApiOperationObject;

/** Shared by the build- and test-scoped get endpoints. */
async function getTargetCommentPayload(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
}): Promise<CommentPayload> {
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  await assertCommentTargetPermission({
    target,
    user: auth.user,
    permission: "view",
    message: `You do not have permission to view this ${target.type}`,
  });

  const comment = await getTargetComment({
    commentId: input.params.commentId,
    target,
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

  return serializeComment(comment);
}

export const getComment: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await getTargetCommentPayload({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );

  get(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
    async (req, res) => {
      res.send(
        await getTargetCommentPayload({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );
};
