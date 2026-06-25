import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getVisibleBuildComments } from "@/comment/getVisibleBuildComments";

import { assertBuildPermission, getPatAuthAndBuild } from "../auth/build";
import { BuildNumber } from "../schema/primitives/build";
import { CommentSchema, serializeComments } from "../schema/primitives/comment";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

export const listCommentsOperation = {
  operationId: "listComments",
  summary: "List the comments on a build",
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  responses: {
    "200": {
      description:
        "Build comments, oldest first. Replies carry a threadId pointing at their root comment.",
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
  },
} satisfies ZodOpenApiOperationObject;

export const listComments: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/builds/{buildNumber}/comments",
    async (req, res) => {
      const { auth, build } = await getPatAuthAndBuild(req, req.ctx.params);

      await assertBuildPermission({
        build,
        user: auth.user,
        permission: "view",
        message: "You do not have permission to view this build",
      });

      const comments = await getVisibleBuildComments({
        buildId: build.id,
        viewerUserId: auth.user.id,
      });

      res.send(await serializeComments(comments));
    },
  );
};
