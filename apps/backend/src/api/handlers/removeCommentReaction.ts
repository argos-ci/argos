import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { removeCommentReaction as removeCommentReactionService } from "@/comment/removeCommentReaction";

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

const RemoveReactionQuerySchema = z.object({
  emoji: z.string().meta({ description: "The emoji reaction to remove." }),
});

export const removeBuildCommentReactionOperation = {
  operationId: "removeBuildCommentReaction",
  summary: "Remove an emoji reaction from a comment on a build",
  description:
    "Remove an emoji reaction previously added by the authenticated user from a comment on a build.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
      commentId: CommentId,
    }),
    query: RemoveReactionQuerySchema,
  },
  responses: commentResponses("Reaction removed — returns the comment"),
} satisfies ZodOpenApiOperationObject;

export const removeTestCommentReactionOperation = {
  operationId: "removeTestCommentReaction",
  summary: "Remove an emoji reaction from a comment on a test",
  description:
    "Remove an emoji reaction previously added by the authenticated user from a comment on a test.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
      commentId: CommentId,
    }),
    query: RemoveReactionQuerySchema,
  },
  responses: commentResponses("Reaction removed — returns the comment"),
} satisfies ZodOpenApiOperationObject;

/** Shared by the build- and test-scoped remove-reaction endpoints. */
async function removeTargetCommentReaction(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  query: z.infer<typeof RemoveReactionQuerySchema>;
}): Promise<CommentPayload> {
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  await assertCommentTargetPermission({
    target,
    user: auth.user,
    permission: "review",
    message: "You do not have permission to react to this comment",
  });

  const comment = await getTargetComment({
    commentId: input.params.commentId,
    target,
  });

  const updated = await removeCommentReactionService({
    comment,
    userId: auth.user.id,
    emoji: input.query.emoji,
  });

  return serializeComment(updated);
}

export const removeCommentReaction: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
    async (req, res) => {
      res.send(
        await removeTargetCommentReaction({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          query: req.ctx.query,
        }),
      );
    },
  );

  del(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/reactions",
    async (req, res) => {
      res.send(
        await removeTargetCommentReaction({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          query: req.ctx.query,
        }),
      );
    },
  );
};
