import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { IgnoredChange, ScreenshotDiff } from "@/database/models";
import { getStartDateFromPeriod, getTestSeriesMetrics } from "@/metrics/test";
import { formatTestId } from "@/util/test-id";

import {
  type IResolvers,
  type ITestMetrics,
} from "../__generated__/resolver-types";
import { paginateResult } from "./PageInfo";
import type { TestChangeObject } from "./TestChange";

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

  type TestConnection implements Connection {
    edges: [Test!]!
    pageInfo: PageInfo!
  }

  enum TestStatus {
    ONGOING
    REMOVED
  }

  type Test implements Node {
    id: ID!
    createdAt: DateTime!
    name: String!
    buildName: String!
    status: TestStatus!
    project: Project!
    screenshot: Screenshot
    firstSeenDiff: ScreenshotDiff
    lastSeenDiff: ScreenshotDiff
    changes(
      period: MetricsPeriod!
      after: Int!
      first: Int!
      """
      Restrict the changes to the ones currently ignored (\`true\`) or to the ones
      still under review (\`false\`). Null returns both.
      """
      ignored: Boolean
    ): TestChangesConnection!
    metrics(period: MetricsPeriod): TestMetrics!
    trails: [AuditTrail!]!
  }

  type AuditTrail implements Node {
    id: ID!
    date: DateTime!
    action: String!
    user: User!
  }
`;

export const resolvers: IResolvers = {
  Test: {
    id: async (test, _args, ctx) => {
      const project = await ctx.loaders.Project.load(test.projectId);
      invariant(project);
      return formatTestId({ projectName: project.name, testId: test.id });
    },
    project: async (test, _args, ctx) => {
      const project = await ctx.loaders.Project.load(test.projectId);
      invariant(project);
      return project;
    },
    status: async (test, _args, ctx) => {
      return ctx.loaders.TestStatusLoader.load({
        projectId: test.projectId,
        testId: test.id,
      });
    },
    screenshot: async (test, _args, ctx) => {
      return ctx.loaders.LatestCompareScreenshotLoader.load(test.id);
    },
    firstSeenDiff: async (test, _args, ctx) => {
      const res = await ctx.loaders.SeenDiffsLoader.load(test.id);
      return res.first;
    },
    lastSeenDiff: async (test, _args, ctx) => {
      const res = await ctx.loaders.SeenDiffsLoader.load(test.id);
      return res.last;
    },
    changes: async (test, args, ctx) => {
      const { period, after, first, ignored } = args;
      const from = getStartDateFromPeriod(period);

      const totalOccurrencesQuery = `
        SELECT sum(tsf.value) FROM test_stats_fingerprints tsf
          WHERE tsf."testId" = screenshot_diffs."testId"
          AND tsf.fingerprint = screenshot_diffs.fingerprint
          AND tsf.date >= :from
      `;

      const diffQuery = ScreenshotDiff.query()
        .select("screenshot_diffs.id")
        .distinctOn("screenshot_diffs.fingerprint")
        .joinRelated("build")
        .where("screenshot_diffs.testId", test.id)
        .where("screenshot_diffs.score", ">", 0)
        .where("build.type", "reference")
        .where("build.createdAt", ">", from)
        .whereNotNull("screenshot_diffs.fingerprint")
        .orderBy("screenshot_diffs.fingerprint");

      const query = ScreenshotDiff.query()
        .select("screenshot_diffs.fingerprint")
        .whereIn("id", diffQuery.clone())
        .orderByRaw(`(${totalOccurrencesQuery}) DESC`, { from })
        .range(after, after + first - 1);

      if (ignored != null) {
        // A change is ignored per project + test + fingerprint, and both the
        // test and the project are fixed here, so matching on the fingerprint
        // alone is enough.
        const ignoredFingerprints = IgnoredChange.query()
          .select("fingerprint")
          .where("projectId", test.projectId)
          .where("testId", test.id);

        if (ignored) {
          query.whereIn("screenshot_diffs.fingerprint", ignoredFingerprints);
        } else {
          query.whereNotIn("screenshot_diffs.fingerprint", ignoredFingerprints);
        }
      }

      const [project, result] = await Promise.all([
        ctx.loaders.Project.load(test.projectId),
        query,
      ]);

      invariant(project);

      return paginateResult({
        result: {
          total: result.total,
          results: result.results.map((screenshotDiff): TestChangeObject => {
            invariant(
              screenshotDiff.fingerprint,
              "Diffs without a fingerprint are filtered out by the query",
            );
            return {
              project,
              testId: test.id,
              fingerprint: screenshotDiff.fingerprint,
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
    trails: async (test, _args, ctx) => {
      return ctx.loaders.TestAuditTrailLoader.load({
        projectId: test.projectId,
        testId: test.id,
      });
    },
  },
  AuditTrail: {
    user: async (auditTrail, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: auditTrail.userId,
      });
      invariant(account, "Account should exist");
      return account;
    },
  },
};

export type TestMetrics = {
  series: () => Promise<ITestMetrics["series"]>;
  all: () => Promise<ITestMetrics["all"]>;
};
