import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models/Build";

import { getProjectFromReqAndParams } from "../auth/project";
import { BuildSchema, serializeBuilds } from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { ProjectName, ProjectOwner } from "../schema/primitives/project";
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
      owner: ProjectOwner,
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
    const project = await getProjectFromReqAndParams(req, req.ctx.params);

    const { page, perPage, head, headSha, distinctName } = req.ctx.query;
    const builds = await fetchProjectBuilds({
      projectId: project.id,
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

async function fetchProjectBuilds({
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
