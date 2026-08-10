import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  resolveCommentThread as resolveCommentThreadService,
  unresolveCommentThread as unresolveCommentThreadService,
} from "@/comment/resolveCommentThread";

import {
  assertCommentTargetPermission,
  getTargetCommentThread,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  commentResponses,
  serializeComment,
  ThreadCommentId,
  type CommentPayload,
} from "../schema/primitives/comment";
import { MediaId } from "../schema/primitives/media";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const BuildPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
  commentId: ThreadCommentId,
});

const TestPathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  testId: TestId,
  commentId: ThreadCommentId,
});

const MediaPathParams = z.object({
  mediaId: MediaId,
  commentId: ThreadCommentId,
});

export const resolveBuildCommentThreadOperation = {
  operationId: "resolveBuildCommentThread",
  summary: "Mark a build comment thread as resolved",
  description: "Mark a comment thread on a build as resolved.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: commentResponses("Thread resolved — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unresolveBuildCommentThreadOperation = {
  operationId: "unresolveBuildCommentThread",
  summary: "Reopen a resolved build comment thread",
  description: "Reopen a previously resolved comment thread on a build.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathParams },
  responses: commentResponses("Thread reopened — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const resolveTestCommentThreadOperation = {
  operationId: "resolveTestCommentThread",
  summary: "Mark a test comment thread as resolved",
  description: "Mark a comment thread on a test as resolved.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: commentResponses("Thread resolved — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const resolveMediaCommentThreadOperation = {
  operationId: "resolveMediaCommentThread",
  summary: "Mark a media comment thread as resolved",
  description: "Mark a comment thread on a media as resolved.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: MediaPathParams },
  responses: commentResponses("Thread resolved — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unresolveTestCommentThreadOperation = {
  operationId: "unresolveTestCommentThread",
  summary: "Reopen a resolved test comment thread",
  description: "Reopen a previously resolved comment thread on a test.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathParams },
  responses: commentResponses("Thread reopened — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

export const unresolveMediaCommentThreadOperation = {
  operationId: "unresolveMediaCommentThread",
  summary: "Reopen a resolved media comment thread",
  description: "Reopen a previously resolved comment thread on a media.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: MediaPathParams },
  responses: commentResponses("Thread reopened — returns the root comment"),
} satisfies ZodOpenApiOperationObject;

/**
 * Resolve or reopen a thread, shared by the build- and test-scoped endpoints.
 * Both require the "review" permission, like posting a comment does.
 */
async function setTargetThreadResolution(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams & { commentId: string };
  resolved: boolean;
}): Promise<CommentPayload> {
  const { resolved } = input;
  const { auth, target } = await loadCommentTargetForUserAuth(
    input.authPromise,
    input.params,
  );

  await assertCommentTargetPermission({
    target,
    user: auth.user,
    permission: "review",
    message: resolved
      ? "You do not have permission to resolve this thread"
      : "You do not have permission to reopen this thread",
  });

  const thread = await getTargetCommentThread({
    commentId: input.params.commentId,
    target,
  });

  const updated = resolved
    ? await resolveCommentThreadService({ thread })
    : await unresolveCommentThreadService({ thread });

  return serializeComment(updated);
}

export const resolveCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/resolve",
    async (req, res) => {
      res.send(
        await setTargetThreadResolution({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          resolved: true,
        }),
      );
    },
  );

  post(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/resolve",
    async (req, res) => {
      res.send(
        await setTargetThreadResolution({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          resolved: true,
        }),
      );
    },
  );

  post("/media/{mediaId}/comments/{commentId}/resolve", async (req, res) => {
    res.send(
      await setTargetThreadResolution({
        authPromise: req.ctx.auth(),
        params: req.ctx.params,
        resolved: true,
      }),
    );
  });
};

export const unresolveCommentThread: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/unresolve",
    async (req, res) => {
      res.send(
        await setTargetThreadResolution({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          resolved: false,
        }),
      );
    },
  );

  post(
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/unresolve",
    async (req, res) => {
      res.send(
        await setTargetThreadResolution({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
          resolved: false,
        }),
      );
    },
  );

  post("/media/{mediaId}/comments/{commentId}/unresolve", async (req, res) => {
    res.send(
      await setTargetThreadResolution({
        authPromise: req.ctx.auth(),
        params: req.ctx.params,
        resolved: false,
      }),
    );
  });
};
