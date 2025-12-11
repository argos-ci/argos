import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build } from "@/database/models/Build";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildSchema, serializeBuilds } from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { Sha1HashSchema } from "../schema/primitives/sha";
import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const GetAuthProjectBuildsParams = PageParamsSchema.extend({
  commit: Sha1HashSchema.optional(),
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

export const getAuthProjectBuildsOperation = {
  operationId: "getAuthProjectBuilds",
  requestParams: {
    query: GetAuthProjectBuildsParams,
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
    "401": unauthorized,
    "400": invalidParameters,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getAuthProjectBuilds: CreateAPIHandler = ({ get }) => {
  return get("/project/builds", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const { page, perPage, commit, distinctName } = req.ctx.query;

    const filterQuery = Build.query()
      .select("builds.id")
      .where("builds.projectId", req.authProject.id);

    if (commit) {
      // Check if the commit is in the compareScreenshotBucket or prHeadCommit
      filterQuery.joinRelated("compareScreenshotBucket").where((qb) => {
        qb.where("compareScreenshotBucket.commit", commit).orWhere(
          "prHeadCommit",
          commit,
        );
      });
    }

    if (distinctName) {
      filterQuery
        .distinctOn("builds.name")
        .orderBy("builds.name")
        .orderBy("builds.id", "desc");
    }

    const builds = await Build.query()
      .withGraphFetched("project.account")
      .whereIn("id", filterQuery)
      .orderBy("builds.id", "desc")
      .page(page - 1, perPage);

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
