import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { loadTestForAuth } from "../auth/test";
import {
  getMetricsPeriodStartDate,
  MetricsPeriodSchema,
} from "../schema/primitives/metrics";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  listTestChanges as listChanges,
  TestChangeSchema,
  TestId,
} from "../schema/primitives/test";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ListTestChangesParams = PageParamsSchema.extend({
  metricsPeriod: MetricsPeriodSchema,
  ignored: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      switch (value) {
        case "true":
          return true;
        case "false":
          return false;
        case undefined:
          return null;
      }
    })
    .meta({
      description:
        "Restrict the changes to the ones currently ignored (`true`) or to the ones still under review (`false`). Omit it to get both.",
    }),
});

export const listTestChangesOperation = {
  operationId: "listTestChanges",
  summary: "List a test's changes",
  description:
    "List the distinct changes a test produced over a period, the ones that came back most often first. Each change is one exact visual difference, with how many times it reappeared, whether it is ignored, and the diff of its latest occurrence — so you can look at what moved. A change that keeps reappearing while nothing in the UI changed is a flaky one: fix what makes it unstable, or silence it with `ignoreChange`.",
  tags: ["Tests"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
    }),
    query: ListTestChangesParams,
  },
  responses: {
    "200": {
      description: "List of the test's changes",
      content: {
        "application/json": {
          schema: paginated(TestChangeSchema),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listTestChanges: CreateAPIHandler = ({ get }) => {
  get(
    "/projects/{owner}/{project}/tests/{testId}/changes",
    async (req, res) => {
      const { page, perPage, metricsPeriod, ignored } = req.ctx.query;
      const { test, project } = await loadTestForAuth(
        req.ctx.auth(),
        req.ctx.params,
      );

      const changes = await listChanges({
        test,
        project,
        metricsFrom: getMetricsPeriodStartDate(metricsPeriod),
        ignored,
        page,
        perPage,
      });

      res.send({
        results: changes.results,
        pageInfo: {
          total: changes.total,
          page,
          perPage,
        },
      });
    },
  );
};
