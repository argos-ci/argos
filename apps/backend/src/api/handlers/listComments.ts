import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getVisibleTargetComments } from "@/comment/getVisibleComments";

import {
  assertCommentTargetPermission,
  loadCommentTargetForUserAuth,
  type CommentAuth,
  type CommentRouteParams,
} from "../auth/comment";
import { BuildNumber } from "../schema/primitives/build";
import {
  commentErrorResponses,
  CommentSchema,
  serializeComments,
  type CommentPayload,
} from "../schema/primitives/comment";
import { MediaId } from "../schema/primitives/media";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const responses = {
  "200": {
    description:
      "Comments, oldest first. Replies carry a threadId pointing at their root comment.",
    content: {
      "application/json": {
        schema: z.array(CommentSchema),
      },
    },
  },
  ...commentErrorResponses,
};

export const listBuildCommentsOperation = {
  operationId: "listBuildComments",
  summary: "List the comments on a build",
  description: "List the comments on a build.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  responses,
} satisfies ZodOpenApiOperationObject;

export const listTestCommentsOperation = {
  operationId: "listTestComments",
  summary: "List the comments on a test",
  description: "List the comments on a test.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
    }),
  },
  responses,
} satisfies ZodOpenApiOperationObject;

export const listMediaCommentsOperation = {
  operationId: "listMediaComments",
  summary: "List the comments on a media",
  description:
    "List the comments on an uploaded media, oldest first. A comment may carry an `anchor` pinning it to a point on the image, which is how reviewers mark up a screenshot.",
  tags: ["Comments"],
  security: patOrOAuthAuth(["comments:read"]),
  requestParams: {
    path: z.object({
      mediaId: MediaId,
    }),
  },
  responses,
} satisfies ZodOpenApiOperationObject;

/** Shared by the build-, test- and media-scoped list endpoints. */
async function listTargetComments(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams;
}): Promise<CommentPayload[]> {
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

  const comments = await getVisibleTargetComments({
    target,
    viewerUserId: auth.user.id,
  });

  return serializeComments(comments);
}

export const listComments: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments",
    async (req, res) => {
      res.send(
        await listTargetComments({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );

  get(
    "/projects/{owner}/{project}/tests/{testId}/comments",
    async (req, res) => {
      res.send(
        await listTargetComments({
          authPromise: req.ctx.auth(),
          params: req.ctx.params,
        }),
      );
    },
  );

  get("/media/{mediaId}/comments", async (req, res) => {
    res.send(
      await listTargetComments({
        authPromise: req.ctx.auth(),
        params: req.ctx.params,
      }),
    );
  });
};
