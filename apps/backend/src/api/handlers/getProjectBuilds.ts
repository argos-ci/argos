import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { getProjectFromReqAndParams } from "../auth/project";
import {
  BuildSchema,
  listBuilds,
  serializeBuilds,
} from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { Sha1HashSchema } from "../schema/primitives/sha";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const GetProjectBuildsParams = PageParamsSchema.extend({
  head: z.string().min(1).optional(),
  headSha: Sha1HashSchema.optional(),
  distinctName: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") {
        return true;
      }
      if (v === "false") {
        return false;
      }
      return null;
    })
    .meta({
      description:
        "Only return the latest builds created, unique by name and commit.",
    }),
});

export const getProjectBuildsOperation = {
  operationId: "getProjectBuilds",
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: GetProjectBuildsParams,
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

export const getProjectBuilds: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/builds", async (req, res) => {
    const { page, perPage } = req.ctx.query;
    const project = await getProjectFromReqAndParams(req, req.ctx.params);
    const builds = await listBuilds({ projectId: project.id }, req.ctx.query);
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
