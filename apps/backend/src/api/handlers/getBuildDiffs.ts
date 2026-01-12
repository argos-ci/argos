import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build, ScreenshotDiff } from "@/database/models";
import { sortScreenshotDiffsForBuild } from "@/database/services/screenshot-diffs";
import { boom } from "@/util/error";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildIdSchema } from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import {
  serializeSnapshotDiffs,
  SnapshotDiffSchema,
} from "../schema/primitives/snapshot-diff";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const GetBuildDiffsParams = PageParamsSchema;

export const getBuildDiffsOperation = {
  operationId: "getBuildDiffs",
  requestParams: {
    path: z.object({
      buildId: BuildIdSchema,
    }),
    query: GetBuildDiffsParams,
  },
  responses: {
    "200": {
      description: "List of screenshot diffs",
      content: {
        "application/json": {
          schema: paginated(SnapshotDiffSchema),
        },
      },
    },
    "401": unauthorized,
    "404": notFound,
    "400": invalidParameters,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getBuildDiffs: CreateAPIHandler = ({ get }) => {
  return get("/builds/{buildId}/diffs", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const {
      params: { buildId },
      query: { page, perPage },
    } = req.ctx;

    const build = await Build.query().findOne({
      id: buildId,
      projectId: req.authProject.id,
    });

    if (!build) {
      throw boom(404, "Not found");
    }

    const diffs = await sortScreenshotDiffsForBuild(
      ScreenshotDiff.query()
        .where("screenshot_diffs.buildId", build.id)
        .select("screenshot_diffs.*")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .withGraphFetched(
          "[baseScreenshot.file, compareScreenshot.file, file]",
        ),
    ).page(page - 1, perPage);

    const results = await serializeSnapshotDiffs(diffs.results);

    res.send({
      results,
      pageInfo: {
        total: diffs.total,
        page,
        perPage,
      },
    });
  });
};
