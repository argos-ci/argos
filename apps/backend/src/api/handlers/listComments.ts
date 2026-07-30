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
import { CommentSchema, serializeComments } from "../schema/primitives/comment";
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
  "400": invalidParameters,
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
  "500": serverError,
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

/** Shared by the build- and test-scoped list endpoints. */
async function listTargetComments(input: {
  authPromise: Promise<CommentAuth>;
  params: CommentRouteParams;
}): Promise<z.infer<typeof CommentSchema>[]> {
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
};
