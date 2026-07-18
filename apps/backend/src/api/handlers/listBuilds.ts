import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getProjectForAuth } from "../auth/project";
import {
  BuildListParamsSchema,
  BuildSchema,
  listBuilds as listBuildsQuery,
  serializeBuilds,
} from "../schema/primitives/build";
import { paginated } from "../schema/primitives/pagination";
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

export const listBuildsOperation = {
  operationId: "listBuilds",
  summary: "List a project's builds",
  description:
    "List the builds of a project, most recent first. Results are paginated. Use `search` to match builds by name, branch or commit, and `distinctName` to return only the latest build per name and commit.",
  tags: ["Builds"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: BuildListParamsSchema,
  },
  responses: {
    "200": {
      description: "List of builds",
      content: {
        "application/json": {
          schema: paginated(BuildSchema),
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

export const listBuilds: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/builds", async (req, res) => {
    const { page, perPage } = req.ctx.query;
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);
    const builds = await listBuildsQuery(
      { projectId: project.id },
      req.ctx.query,
    );
    const results = await serializeBuilds(builds.results);
    res.send({
      results,
      pageInfo: {
        total: builds.total,
        page,
        perPage,
      },
    });
  });
};
