import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build, ScreenshotDiff } from "@/database/models";
import { sortScreenshotDiffsForBuild } from "@/database/services/screenshot-diffs";
import { boom } from "@/util/error";

import {
  assertProjectAccess,
  getAuthPayloadFromExpressReq,
} from "../auth/project";
import { BuildNumber } from "../schema/primitives/build";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { ProjectName, ProjectOwner } from "../schema/primitives/project";
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

const GetBuildDiffsParams = PageParamsSchema.extend({
  needsReview: z
    .string()
    .optional()
    .transform((value) => {
      if (value === "true") {
        return true;
      }
      if (value === "false" || value == null) {
        return false;
      }
      return value;
    })
    .pipe(z.boolean())
    .meta({
      description:
        "Only return diffs that require review. Matches `changed`, `added`, and `removed`, except `removed` is excluded for subset builds.",
    }),
});

export const getBuildDiffsOperation = {
  operationId: "getBuildDiffs",
  requestParams: {
    path: z.object({
      owner: ProjectOwner,
      project: ProjectName,
      buildNumber: BuildNumber,
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
  return get(
    "/projects/{owner}/{project}/builds/{buildNumber}/diffs",
    async (req, res) => {
      const {
        params,
        query: { page, perPage, needsReview },
      } = req.ctx;

      const [auth, build] = await Promise.all([
        getAuthPayloadFromExpressReq(req),
        Build.query()
          .joinRelated("project.account")
          .where("project:account.slug", params.owner)
          .where("number", params.buildNumber)
          .first(),
      ]);

      assertProjectAccess(auth, {
        projectId: build?.projectId ?? null,
        owner: params.owner,
      });

      if (!build) {
        throw boom(404, "Not found");
      }

      invariant(build.project, "Build project is missing");

      const diffsQuery = ScreenshotDiff.query()
        .where("screenshot_diffs.buildId", build.id)
        .select("screenshot_diffs.*")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .withGraphFetched(
          "[baseScreenshot.file, compareScreenshot.file, file]",
        );

      if (needsReview) {
        diffsQuery.where((qb) => {
          qb.where((changedQuery) => {
            changedQuery
              .whereNotNull("screenshot_diffs.score")
              .where("screenshot_diffs.score", ">", 0)
              .where("screenshot_diffs.ignored", false);
          }).orWhere((addedQuery) => {
            addedQuery
              .whereNull("screenshot_diffs.baseScreenshotId")
              .whereNotNull("screenshot_diffs.compareScreenshotId")
              .where(
                "compareScreenshot.name",
                "!~",
                ScreenshotDiff.screenshotFailureRegexp.source,
              );
          });

          if (!build.subset) {
            qb.orWhereNull("screenshot_diffs.compareScreenshotId");
          }
        });
      }

      const diffs = await sortScreenshotDiffsForBuild(diffsQuery).page(
        page - 1,
        perPage,
      );

      const results = await serializeSnapshotDiffs(diffs.results);

      res.send({
        results,
        pageInfo: {
          total: diffs.total,
          page,
          perPage,
        },
      });
    },
  );
};
