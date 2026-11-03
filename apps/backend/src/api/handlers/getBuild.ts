import z from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { loadBuildForAuth, VIEW_BUILD_ACCESS } from "../auth/build";
import {
  BuildNumber,
  BuildSchema,
  serializeBuild,
} from "../schema/primitives/build";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const getBuildOperation = {
  operationId: "getBuild",
  summary: "Get a build",
  description:
    "Retrieve a single build by its number within a project, including its status and metadata.",
  tags: ["Builds"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
  },
  responses: {
    "200": {
      description: "Build",
      content: { "application/json": { schema: BuildSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getBuild: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/builds/{buildNumber}", async (req, res) => {
    const { build } = await loadBuildForAuth(
      req.ctx.auth(),
      req.ctx.params,
      VIEW_BUILD_ACCESS,
    );
    res.send(await serializeBuild(build));
  });
};
