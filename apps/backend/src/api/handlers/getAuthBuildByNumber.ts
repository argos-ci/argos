import z from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildSchema, serializeBuild } from "../schema/primitives/build";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";
import {
  getAuthorizedProjectFromRequest,
  getAuthorizedProjectFromRequestResponses,
} from "./projectAccess";

const BuildNumberSchema = z
  .string()
  .transform((value) => z.coerce.number().int().min(1).parse(value))
  .meta({
    description: "The build number",
    example: 42,
    id: "BuildNumber",
  });

const ProjectPathParamsSchema = z.object({
  owner: z.string().min(1),
  project: z.string().min(1),
  buildNumber: BuildNumberSchema,
});

const responses = {
  ...getAuthorizedProjectFromRequestResponses,
  "200": {
    description: "Build",
    content: { "application/json": { schema: BuildSchema } },
  },
  "400": invalidParameters,
  "401": unauthorized,
  "404": notFound,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getAuthBuildByNumberOperation = {
  operationId: "getAuthBuildByNumber",
  requestParams: { path: z.object({ buildNumber: BuildNumberSchema }) },
  responses,
} satisfies ZodOpenApiOperationObject;

export const getProjectBuildByNumberOperation = {
  operationId: "getProjectBuildByNumber",
  requestParams: { path: ProjectPathParamsSchema },
  responses: { ...responses, "403": forbidden },
} satisfies ZodOpenApiOperationObject;

async function fetchBuildOrThrow(args: {
  projectId: string;
  buildNumber: number;
}) {
  const { buildNumber, projectId } = args;

  const build = await Build.query().findOne({
    number: buildNumber,
    projectId,
  });

  if (!build) {
    throw boom(404, "Not found");
  }

  return build;
}

export const getAuthBuildByNumber: CreateAPIHandler = ({ get }) => {
  get("/project/builds/{buildNumber}", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const build = await fetchBuildOrThrow({
      projectId: req.authProject.id,
      buildNumber: req.ctx.params.buildNumber,
    });

    res.send(await serializeBuild(build));
  });

  get(
    "/projects/{owner}/{project}/builds/{buildNumber}",
    repoAuth,
    async (req, res) => {
      const { owner, project, buildNumber } = req.ctx.params;
      const authorizedProject = await getAuthorizedProjectFromRequest({
        request: req,
        owner,
        projectName: project,
      });

      const build = await fetchBuildOrThrow({
        projectId: authorizedProject.id,
        buildNumber,
      });

      res.send(await serializeBuild(build));
    },
  );
};
