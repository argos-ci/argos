import gqlTag from "graphql-tag";

import { knex } from "@argos-ci/database";
import { Screenshot, ScreenshotDiff, Test } from "@argos-ci/database/models";

const { gql } = gqlTag;

const getLastScreenshotDiff = async (test: Test) => {
  const screenshotDiff = await ScreenshotDiff.query()
    .where({ testId: test.id })
    .orderBy("createdAt", "desc")
    .first();
  return screenshotDiff ?? null;
};

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

  extend type Mutation {
    "Mute or unmute tests"
    muteTests(
      ids: [String!]!
      muted: Boolean!
      muteUntil: String
    ): MuteUpdateTest!
  }
`;

export const resolvers = {
  Test: {
    lastSeen: async (test: Test) => {
      const lastScreenshotDiff = await test.$relatedQuery("lastScreenshotDiff");
      return lastScreenshotDiff?.createdAt ?? null;
    },
    stabilityScore: async (test: Test) => {
      const lastScreenshotDiff = await test.$relatedQuery("lastScreenshotDiff");
      return lastScreenshotDiff?.stabilityScore ?? null;
    },
    unstable: async (test: Test) => {
      const lastScreenshotDiff = await getLastScreenshotDiff(test);
      if (!lastScreenshotDiff || lastScreenshotDiff.stabilityScore === null) {
        return false;
      }
      return lastScreenshotDiff.stabilityScore < 60;
    },
    screenshot: async (test: Test) => {
      const repository = await test.$relatedQuery("repository");
      return Screenshot.query()
        .where({ testId: test.id })
        .joinRelated("screenshotBucket")
        .orderByRaw(
          `CASE WHEN "screenshotBucket".branch = ? THEN 0 ELSE 1 END`,
          repository.referenceBranch
        )
        .orderBy("createdAt", "desc")
        .first();
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
  },
};
