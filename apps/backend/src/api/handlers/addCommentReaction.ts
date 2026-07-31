import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { addCommentReaction as addCommentReactionService } from "@/comment/addCommentReaction";

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

const AddReactionBodySchema = z.object({
  emoji: z.string().meta({ description: "The emoji to react with." }),
});

const requestBody = {
  required: true,
  content: {
    "application/json": {
      schema: AddReactionBodySchema,
    },
  },
};

export const addBuildCommentReactionOperation = {
  operationId: "addBuildCommentReaction",
  summary: "Add an emoji reaction to a comment on a build",
  description:
    "Add an emoji reaction to a comment on a build, on behalf of the authenticated user.",
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
  responses: commentResponses("Reaction added — returns the comment"),
} satisfies ZodOpenApiOperationObject;

export const addTestCommentReactionOperation = {
  operationId: "addTestCommentReaction",
  summary: "Add an emoji reaction to a comment on a test",
  description:
    "Add an emoji reaction to a comment on a test, on behalf of the authenticated user.",
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
  responses: commentResponses("Reaction added — returns the comment"),
} satisfies ZodOpenApiOperationObject;

/** Shared by the build- and test-scoped add-reaction endpoints. */
async function addTargetCommentReaction(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  body: z.infer<typeof AddReactionBodySchema>;
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

  const updated = await addCommentReactionService({
    comment,
    userId: auth.user.id,
    emoji: input.body.emoji,
  });

  return serializeComment(updated);
}

export const addCommentReaction: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
    async (req, res) => {
      res.send(
        await addTargetCommentReaction({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );

  post(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/reactions",
    async (req, res) => {
      res.send(
        await addTargetCommentReaction({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          body: req.ctx.body,
        }),
      );
    },
  );
};
