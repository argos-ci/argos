import gqlTag from "graphql-tag";

import { knex } from "@argos-ci/database";
import { ScreenshotDiff, Test } from "@argos-ci/database/models";

import type { Context } from "../context.js";

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
    screenshot: Screenshot!
    dailyChanges: [dailyCount!]!
    totalBuilds: Int!
  }

  type TestConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Test!]!
  }

  type MuteUpdateTest {
    ids: [String!]!
    mute: Boolean!
    muteUntil: String
  }

  type UpdatedTestStatuses {
    ids: [String!]!
    status: TestStatus!
  }

  extend type Mutation {
    "Mute or unmute tests"
    muteTests(
      ids: [String!]!
      muted: Boolean!
      muteUntil: String
    ): MuteUpdateTest!
    "Update test statuses"
    updateTestStatuses(
      ids: [String!]!
      status: TestStatus!
    ): UpdatedTestStatuses!
  }
`;

export const resolvers = {
  Test: {
    lastSeen: async (
      test: Test,
      _args: Record<string, never>,
      context: Context
    ) => {
      const lastScreenshotDiff = await context.loaders.LastScreenshotDiff.load(
        test.id
      );
      return lastScreenshotDiff?.createdAt ?? null;
    },
    stabilityScore: async (
      test: Test,
      _args: Record<string, never>,
      context: Context
    ) => {
      const lastScreenshotDiff = await context.loaders.LastScreenshotDiff.load(
        test.id
      );
      return lastScreenshotDiff?.stabilityScore ?? null;
    },
    unstable: async (
      test: Test,
      _args: Record<string, never>,
      context: Context
    ) => {
      const lastScreenshotDiff = await context.loaders.LastScreenshotDiff.load(
        test.id
      );
      return (lastScreenshotDiff?.stabilityScore ?? 100) < 60;
    },
    screenshot: async (
      test: Test,
      _args: Record<string, never>,
      context: Context
    ) => {
      return context.loaders.LastScreenshot.load(test.id);
    },
    dailyChanges: async (test: Test) => {
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
        test.id
      );
      return result.rows;
    },
    totalBuilds: async (test: Test) => {
      const screenshotDiffs = await test.$relatedQuery("screenshotDiffs");
      return screenshotDiffs.length ?? 0;
    },
  },
  Mutation: {
    muteTests: async (
      _root: null,
      args: { ids: string[]; muted: boolean; muteUntil: string | null }
    ) => {
      if (args.ids.length === 0) {
        return { ids: [], mute: false, muteUntil: args.muteUntil };
      }
      await Test.query()
        .patch({ muted: args.muted, muteUntil: args.muteUntil })
        .whereIn("id", args.ids);
      return { ids: args.ids, mute: args.muted, muteUntil: args.muteUntil };
    },
    updateTestStatuses: async (
      _root: null,
      args: { ids: string[]; status: string }
    ) => {
      if (args.ids.length === 0) {
        return { ids: [], status: args.status };
      }

      if (args.status !== "resolved") {
        return {
          ids: args.ids,
          status: args.status,
          resolvedDate: null,
          resolvedStabilityScore: null,
        };
      }

      const lastScreenshotDiffs = await ScreenshotDiff.query()
        .select("testId", "stabilityScore", "createdAt")
        .whereIn("testId", args.ids)
        .distinctOn("testId")
        .orderBy("testId")
        .orderBy("createdAt", "desc");
      const lastScreenshotDiffMap: Record<string, ScreenshotDiff> = {};
      for (const lastScreenshotDiff of lastScreenshotDiffs) {
        lastScreenshotDiffMap[lastScreenshotDiff.testId!] = lastScreenshotDiff;
      }
      await Promise.all(
        args.ids.map((testId) => {
          return Test.query()
            .patch({
              status: "resolved",
              resolvedDate: new Date().toISOString(),
              resolvedStabilityScore:
                lastScreenshotDiffMap[testId]?.stabilityScore ?? null,
            })
            .where("id", testId);
        })
      );
      return { ids: args.ids, status: args.status };
    },
  },
};
