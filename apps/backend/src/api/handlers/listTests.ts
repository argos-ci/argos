import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { queryActiveTests } from "@/database/services/test";
import { computeTestMetrics } from "@/metrics/test";
import { formatTestId } from "@/util/test-id";

import { getProjectForAuth } from "../auth/project";
import {
  MetricsPeriodSchema,
  toMetricsPeriodEnum,
} from "../schema/primitives/metrics";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestSummarySchema } from "../schema/primitives/test";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ListTestsParams = PageParamsSchema.extend({
  metricsPeriod: MetricsPeriodSchema,
  buildName: z
    .string()
    .optional()
    .meta({ description: "Restrict to the tests of a single build name." }),
  search: z
    .string()
    .optional()
    .meta({ description: "Match tests on their name." }),
});

export const listTestsOperation = {
  operationId: "listTests",
  summary: "List a project's tests",
  description:
    "List the tests currently running in a project, flakiest first. A test is listed when it appeared in the latest reference build of its build name — tests that were deleted, renamed or skipped drop out. Use it to find what to stabilise: the first page is the project's flakiness backlog.",
  tags: ["Tests"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: ListTestsParams,
  },
  responses: {
    "200": {
      description: "List of the project's tests, flakiest first",
      content: {
        "application/json": {
          schema: paginated(TestSummarySchema),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listTests: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/tests", async (req, res) => {
    const { page, perPage, metricsPeriod, buildName, search } = req.ctx.query;
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);

    // Shared with the GraphQL API — same active-test definition, same ranking.
    const tests = await queryActiveTests({
      projectIds: [project.id],
      period: toMetricsPeriodEnum(metricsPeriod),
      filters: { buildName, search },
      after: (page - 1) * perPage,
      first: perPage,
    });

    res.send({
      results: tests.results.map((test) => ({
        id: formatTestId({ projectName: project.name, testId: test.id }),
        name: test.name,
        buildName: test.buildName,
        // The ranking pass already computed the counts behind the order, so the
        // metrics come back with the row rather than costing a query each.
        metrics: computeTestMetrics(test.metrics),
      })),
      pageInfo: { total: tests.total, page, perPage },
    });
  });
};
