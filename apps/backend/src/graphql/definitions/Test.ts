import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Build, ScreenshotDiff, type Project } from "@/database/models";
import { getStartDateFromPeriod, getTestSeriesMetrics } from "@/metrics/test";

import {
  ITestStatus,
  type IResolvers,
  type ITestMetrics,
} from "../__generated__/resolver-types";
import { formatTestChangeId, formatTestId } from "../services/test";
import { paginateResult } from "./PageInfo";

const { gql } = gqlTag;

export const typeDefs = gql`
  type TestMetricDataPoint {
    ts: Timestamp!
    total: Int!
    changes: Int!
    uniqueChanges: Int!
  }

  type TestMetricData {
    total: Int!
    changes: Int!
    uniqueChanges: Int!
    stability: Float!
    consistency: Float!
    flakiness: Float!
  }

  type TestMetrics {
    series: [TestMetricDataPoint!]!
    all: TestMetricData!
  }

  type TestChange implements Node {
    id: ID!
    stats(period: MetricsPeriod!): TestChangeStats!
  }

  type TestChangeStats {
    totalOccurences: Int!
    firstSeenDiff: ScreenshotDiff!
    lastSeenDiff: ScreenshotDiff!
  }

  type TestChangesConnection implements Connection {
    edges: [TestChange!]!
    pageInfo: PageInfo!
  }

  enum TestStatus {
    ONGOING
    REMOVED
  }

  type Test implements Node {
    id: ID!
    name: String!
    status: TestStatus!
    firstSeenDiff: ScreenshotDiff
    lastSeenDiff: ScreenshotDiff
    changes(
      period: MetricsPeriod!
      after: Int!
      first: Int!
    ): TestChangesConnection!
    metrics(period: MetricsPeriod): TestMetrics!
  }
`;

export const resolvers: IResolvers = {
  Test: {
    id: async (test, _args, ctx) => {
      const project = await ctx.loaders.Project.load(test.projectId);
      invariant(project);
      return formatTestId({ projectName: project.name, testId: test.id });
    },
    status: async (test) => {
      // Check if the test is part of any of these builds
      const isActive =
        (await ScreenshotDiff.query()
          .where("testId", test.id)
          .whereIn(
            "buildId",
            Build.query()
              .select("id")
              .distinctOn("name")
              .where("type", "reference")
              .where("projectId", test.projectId)
              .orderBy("name")
              .orderBy("createdAt", "desc"),
          )
          .resultSize()) > 0;

      return isActive ? ITestStatus.Ongoing : ITestStatus.Removed;
    },
    firstSeenDiff: async (test) => {
      const result = await ScreenshotDiff.query()
        .where("testId", test.id)
        .whereNotNull("fileId")
        .orderBy("createdAt", "asc")
        .first();

      return result ?? null;
    },
    lastSeenDiff: async (test) => {
      const result = await ScreenshotDiff.query()
        .where("testId", test.id)
        .whereNotNull("fileId")
        .orderBy("createdAt", "desc")
        .first();

      return result ?? null;
    },
    changes: async (test, args, ctx) => {
      const { period, after, first } = args;
      const from = getStartDateFromPeriod(period);

      const totalOccurencesQuery = `
        SELECT sum(tsc.value) FROM test_stats_changes tsc
          WHERE tsc."testId" = screenshot_diffs."testId"
          AND tsc."fileId" = screenshot_diffs."fileId"
          AND tsc."date" >= :from
      `;

      const diffQuery = ScreenshotDiff.query()
        .select("screenshot_diffs.id")
        .distinctOn("screenshot_diffs.fileId")
        .joinRelated("build")
        .where("screenshot_diffs.testId", test.id)
        .where("screenshot_diffs.score", ">", 0)
        .where("build.type", "reference")
        .where("build.createdAt", ">", from)
        .whereNotNull("screenshot_diffs.fileId")
        .orderBy("screenshot_diffs.fileId");

      const query = ScreenshotDiff.query()
        .select("screenshot_diffs.fileId")
        .whereIn("id", diffQuery.clone())
        .orderByRaw(`(${totalOccurencesQuery}) DESC`, { from })
        .range(after, after + first - 1);

      const [project, result] = await Promise.all([
        ctx.loaders.Project.load(test.projectId),
        query,
      ]);

      invariant(project);

      return paginateResult({
        result: {
          total: result.total,
          results: result.results.map((screenshotDiff) => {
            return {
              project,
              testId: test.id,
              fileId: screenshotDiff.fileId,
            };
          }),
        },
        first,
        after,
      });
    },
    metrics: async (test, { period }, ctx) => {
      const from = getStartDateFromPeriod(period ?? null);
      return {
        series: () =>
          getTestSeriesMetrics({
            testId: test.id,
            from,
          }),
        all: async () => {
          return ctx.loaders.TestAllMetrics.load({
            testId: test.id,
            from,
          });
        },
      };
    },
  },
  TestChange: {
    id: (testChange) =>
      formatTestChangeId({
        projectName: testChange.project.name,
        fileId: testChange.fileId,
      }),
    stats: async (testChange, args, ctx) => {
      const { period } = args;
      const from = getStartDateFromPeriod(period);
      const ChangeStatsLoader = ctx.loaders.getChangeStatsLoader(
        from.toISOString(),
        testChange.testId,
      );
      return ChangeStatsLoader.load({
        fileId: testChange.fileId,
      });
    },
  },
};

export type TestChangeObject = {
  project: Project;
  testId: string;
  fileId: string;
};

export type TestMetrics = {
  series: () => Promise<ITestMetrics["series"]>;
  all: () => Promise<ITestMetrics["all"]>;
};
