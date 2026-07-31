import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { loadTestForAuth } from "../auth/test";
import {
  getMetricsPeriodStartDate,
  MetricsPeriodSchema,
} from "../schema/primitives/metrics";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  serializeTestDetails,
  TestDetailsSchema,
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

export const getTestOperation = {
  operationId: "getTest",
  summary: "Get a test and its flakiness metrics",
  description:
    "Get a test with its flakiness metrics over a period: how many builds ran it, how many times it changed, and how stable and consistent those changes were. The metrics also come bucketed over time, so you can tell a test that has always been flaky from one that started recently. Pair it with `listTestChanges` to see what actually keeps changing.",
  tags: ["Tests"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
      testId: TestId,
    }),
    query: z.object({
      metricsPeriod: MetricsPeriodSchema,
    }),
  },
  responses: {
    "200": {
      description: "The test and its flakiness metrics",
      content: {
        "application/json": {
          schema: TestDetailsSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getTest: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/tests/{testId}", async (req, res) => {
    const { test, project } = await loadTestForAuth(
      req.ctx.auth(),
      req.ctx.params,
    );

    res.send(
      await serializeTestDetails(test, {
        project,
        metricsFrom: getMetricsPeriodStartDate(req.ctx.query.metricsPeriod),
      }),
    );
  });
};
