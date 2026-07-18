import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Build, ScreenshotDiff } from "@/database/models";
import { sortScreenshotDiffsForBuild } from "@/database/services/screenshot-diffs";
import { IMetricsPeriod } from "@/graphql/__generated__/resolver-types";
import { getStartDateFromPeriod } from "@/metrics/test";
import { boom } from "@/util/error";

import { assertProjectAccess } from "../auth/project";
import { BuildNumber } from "../schema/primitives/build";
import { MetricsPeriodSchema } from "../schema/primitives/metrics";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
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
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ListBuildDiffsParams = PageParamsSchema.extend({
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
  metricsPeriod: MetricsPeriodSchema,
});

export const listBuildDiffsOperation = {
  operationId: "listBuildDiffs",
  summary: "List a build's screenshot diffs",
  description:
    "List the screenshot diffs of a build, with pagination. Each diff compares a baseline screenshot to the one captured by the build. Each diff also carries its test's flakiness metrics and, when it is a change, its ignore state and occurrence count — so you can tell whether a change is worth reviewing or is just a flaky one. Use `needsReview` to return only the diffs that require review.",
  tags: ["Builds"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      buildNumber: BuildNumber,
    }),
    query: ListBuildDiffsParams,
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

export const listBuildDiffs: CreateAPIHandler = ({ get }) => {
  return get(
    "/projects/{owner}/{project}/builds/{buildNumber}/diffs",
    async (req, res) => {
      const {
        params,
        query: { page, perPage, needsReview, metricsPeriod },
      } = req.ctx;

      const [auth, build] = await Promise.all([
        req.ctx.auth(),
        Build.query()
          .joinRelated("project.account")
          .where("project:account.slug", params.owner)
          .where("project.name", params.project)
          .where("number", params.buildNumber)
          .withGraphFetched("project")
          .first(),
      ]);

      assertProjectAccess(auth, {
        projectId: build?.projectId ?? null,
        account: { slug: params.owner },
      });

      if (!build) {
        throw boom(404, "Not found");
      }

      invariant(build.project, "Build without project");

      const diffsQuery = ScreenshotDiff.query()
        .where("screenshot_diffs.buildId", build.id)
        .select("screenshot_diffs.*")
        .leftJoinRelated("[baseScreenshot, compareScreenshot]")
        .withGraphFetched(
          "[baseScreenshot.file, compareScreenshot.file, file, test]",
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

      const results = await serializeSnapshotDiffs(diffs.results, {
        project: build.project,
        metricsFrom: getStartDateFromPeriod(metricsPeriod as IMetricsPeriod),
      });

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
