import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";
import { raw } from "objection";

import { Build, ScreenshotDiff } from "@/database/models";
import { getStartDateFromPeriod, getTestSeriesMetrics } from "@/metrics/test";

import {
  IMetricsPeriod,
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
      SELECT COUNT(*) FROM screenshot_diffs sd
        JOIN builds b on b.id = sd."buildId"
        WHERE sd."fileId" = screenshot_diffs."fileId"
        AND sd."testId" = screenshot_diffs."testId"
        AND sd."createdAt" > :from
        AND b.type = 'reference'
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

      const lastSeenQuery = ScreenshotDiff.query()
        .select(
          "screenshot_diffs.*",
          raw(`(${totalOccurencesQuery}) AS "totalOccurences"`, { from }),
        )
        .whereIn(
          "id",
          diffQuery.clone().orderBy("screenshot_diffs.createdAt", "desc"),
        )
        .orderByRaw(`(${totalOccurencesQuery}) DESC`, { from })
        .range(after, after + first - 1);

      const firstSeenQuery = ScreenshotDiff.query()
        .select("screenshot_diffs.*")
        .whereIn(
          "id",
          diffQuery.clone().orderBy("screenshot_diffs.createdAt", "asc"),
        )
        .range(after, after + first - 1);

      const [project, lastSeen, firstSeen] = await Promise.all([
        ctx.loaders.Project.load(test.projectId),
        lastSeenQuery,
        firstSeenQuery,
      ]);

      invariant(project);

      return paginateResult({
        result: {
          total: lastSeen.total,
          results: lastSeen.results.map((lastSeenDiff) => {
            invariant(
              "totalOccurences" in lastSeenDiff &&
                typeof lastSeenDiff.totalOccurences === "string",
              "totalOccurences should be a string",
            );
            const totalOccurences = Number(lastSeenDiff.totalOccurences);
            invariant(
              !isNaN(totalOccurences),
              "totalOccurences should be a number",
            );

            const firstSeenDiff = firstSeen.results.find(
              (firstSeenDiff) => firstSeenDiff.fileId === lastSeenDiff.fileId,
            );
            invariant(
              firstSeenDiff,
              "First seen diff should exist for last seen diff",
            );
            invariant(
              lastSeenDiff.fileId,
              "Last seen diff should have a fileId",
            );
            return {
              id: formatTestChangeId({
                projectName: project.name,
                fileId: lastSeenDiff.fileId,
              }),
              stats: {
                period,
                totalOccurences,
                lastSeenDiff,
                firstSeenDiff,
              },
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
    stats: (testChange, params) => {
      const { period, ...stats } = testChange.stats;
      if (period !== params.period) {
        throw new Error("period must match the one used in the connection");
      }
      return stats;
    },
  },
};

export type TestChange = {
  id: string;
  stats: {
    period: IMetricsPeriod;
    totalOccurences: number;
    firstSeenDiff: ScreenshotDiff;
    lastSeenDiff: ScreenshotDiff;
  };
};

export type TestMetrics = {
  series: () => Promise<ITestMetrics["series"]>;
  all: () => Promise<ITestMetrics["all"]>;
};
