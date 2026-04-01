import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models/Build";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildSchema, serializeBuilds } from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { Sha1HashSchema } from "../schema/primitives/sha";
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

const ProjectPathParamsSchema = z.object({
  owner: z.string().min(1),
  project: z.string().min(1),
});

const GetAuthProjectBuildsParams = PageParamsSchema.extend({
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

const responses = {
  ...getAuthorizedProjectFromRequestResponses,
  "200": {
    description: "List of builds",
    content: {
      "application/json": {
        schema: paginated(BuildSchema),
      },
    },
  },
  "401": unauthorized,
  "400": invalidParameters,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getAuthProjectBuildsOperation = {
  operationId: "getAuthProjectBuilds",
  requestParams: {
    query: GetAuthProjectBuildsParams,
  },
  responses,
} satisfies ZodOpenApiOperationObject;

export const getProjectBuildsOperation = {
  operationId: "getProjectBuilds",
  requestParams: {
    path: ProjectPathParamsSchema,
    query: GetAuthProjectBuildsParams,
  },
  responses: { ...responses, "403": forbidden, "404": notFound },
} satisfies ZodOpenApiOperationObject;

async function getProjectBuilds({
  projectId,
  page,
  perPage,
  head,
  headSha,
  distinctName,
}: {
  projectId: string;
  page: number;
  perPage: number;
  head: string | undefined;
  headSha: string | undefined;
  distinctName: boolean | null;
}) {
  const filterQuery = Build.query()
    .select("builds.id")
    .where("builds.projectId", projectId);

  if (head || headSha) {
    filterQuery.joinRelated("compareScreenshotBucket");
  }

  if (head) {
    filterQuery.where("compareScreenshotBucket.branch", head);
  }

  if (headSha) {
    filterQuery.where((qb) => {
      qb.where("builds.prHeadCommit", headSha).orWhere((subquery) => {
        subquery
          .whereNull("builds.prHeadCommit")
          .where("compareScreenshotBucket.commit", headSha);
      });
    });
  }

  if (distinctName) {
    filterQuery
      .distinctOn("builds.name")
      .orderBy("builds.name")
      .orderBy("builds.id", "desc");
  }

  return Build.query()
    .withGraphFetched(
      "[project.account, compareScreenshotBucket, baseScreenshotBucket]",
    )
    .whereIn("builds.id", filterQuery)
    .orderBy("builds.id", "desc")
    .page(page - 1, perPage);
}

export const getAuthProjectBuilds: CreateAPIHandler = ({ get }) => {
  get("/project/builds", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const projectId = req.authProject.id;
    const { page, perPage, head, headSha, distinctName } = req.ctx.query;
    const builds = await getProjectBuilds({
      projectId,
      page,
      perPage,
      head,
      headSha,
      distinctName,
    });
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

  get("/projects/{owner}/{project}/builds", repoAuth, async (req, res) => {
    const { owner, project } = req.ctx.params;
    const { page, perPage, head, headSha, distinctName } = req.ctx.query;
    const authorizedProject = await getAuthorizedProjectFromRequest({
      request: req,
      owner,
      projectName: project,
    });
    const builds = await getProjectBuilds({
      projectId: authorizedProject.id,
      page,
      perPage,
      head,
      headSha,
      distinctName,
    });
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
