import gqlTag from "graphql-tag";

import { knex } from "@/database/index.js";

import { IResolvers, ITestStatus } from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum TestStatus {
    pending
    flaky
    resolved
  }

  type dailyCount {
    date: Date!
    count: Int!
  }

  type Test implements Node {
    id: ID!
    name: String!
    buildName: String!
    status: TestStatus!
    resolvedDate: DateTime
    mute: Boolean!
    muteUntil: DateTime
    stabilityScore: Int
    lastSeen: DateTime
    unstable: Boolean!
    screenshot: Screenshot
    dailyChanges: [dailyCount!]!
    totalBuilds: Int!
  }

  type TestConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Test!]!
  }
`;

export const resolvers: IResolvers = {
  Test: {
    status: (test) => {
      if (test.status !== ITestStatus.Resolved) {
        return test.status as ITestStatus;
      }
      const now = new Date();
      const resolvedDateLimit = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const resolvedDate = new Date(test.resolvedDate!);
      return resolvedDate > resolvedDateLimit
        ? ITestStatus.Pending
        : ITestStatus.Resolved;
    },
    lastSeen: async (test, _args, ctx) => {
      const lastScreenshotDiff = await ctx.loaders.LastScreenshotDiff.load(
        test.id,
      );
      return lastScreenshotDiff?.createdAt ?? null;
    },
    stabilityScore: async (test, _args, ctx) => {
      const lastScreenshotDiff = await ctx.loaders.LastScreenshotDiff.load(
        test.id,
      );
      return lastScreenshotDiff?.stabilityScore ?? null;
    },
    unstable: async (test, _args, ctx) => {
      const lastScreenshotDiff = await ctx.loaders.LastScreenshotDiff.load(
        test.id,
      );
      return (lastScreenshotDiff?.stabilityScore ?? 100) < 60;
    },
    screenshot: async (test, _args, ctx) => {
      return ctx.loaders.LastScreenshot.load(test.id);
    },
    dailyChanges: async (test) => {
      const result = await knex.raw(
        `SELECT
          to_char(date_trunc('day', gen_date), 'YYYY-MM-DD') AS date,
          count(screenshot_diffs.*) AS count
        FROM (
          SELECT
            generate_series(date_trunc('day', now() - interval '6 days'), now(), '1 day') AS gen_date) AS dates
          LEFT JOIN screenshot_diffs ON to_char(date_trunc('day', screenshot_diffs. "createdAt"), 'YYYY-MM-DD') = to_char(dates.gen_date, 'YYYY-MM-DD')
            AND screenshot_diffs."testId" = ?
            AND screenshot_diffs."score" > 0
          GROUP BY
            date
          ORDER BY
            date ASC;`,
        test.id,
      );
      return result.rows;
    },
    totalBuilds: async (test) => {
      const screenshotDiffs = await test.$relatedQuery("screenshotDiffs");
      return screenshotDiffs.length ?? 0;
    },
  },
};
