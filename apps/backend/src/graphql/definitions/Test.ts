import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { transaction } from "@/database";
import {
  AuditTrail,
  Build,
  IgnoredChange,
  Project,
  ScreenshotDiff,
  type User,
} from "@/database/models";
import { getStartDateFromPeriod, getTestSeriesMetrics } from "@/metrics/test";

import {
  ITestStatus,
  type IResolvers,
  type ITestMetrics,
} from "../__generated__/resolver-types";
import {
  formatTestChangeId,
  formatTestId,
  safeParseTestChangeId,
  type TestChangeIdPayload,
} from "../services/test";
import { forbidden, notFound } from "../util";
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
    ignored: Boolean!
  }

  type TestChangeStats {
    totalOccurrences: Int!
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
    createdAt: DateTime!
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
    trails: [AuditTrail!]!
  }

  type AuditTrail implements Node {
    id: ID!
    date: DateTime!
    action: String!
    user: User!
  }

  input IgnoreChangeInput {
    accountSlug: String!
    changeId: ID!
  }

  input UnignoreChangeInput {
    accountSlug: String!
    changeId: ID!
  }

  extend type Mutation {
    ignoreChange(input: IgnoreChangeInput!): TestChange!
    unignoreChange(input: UnignoreChangeInput!): TestChange!
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
  TestChange: {
    id: (testChange) =>
      formatTestChangeId({
        projectName: testChange.project.name,
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
      }),
    stats: async (testChange, args, ctx) => {
      const { period } = args;
      const from = getStartDateFromPeriod(period);
      const ChangeStatsLoader = ctx.loaders.getChangeStatsLoader(
        from.toISOString(),
        testChange.testId,
      );
      return ChangeStatsLoader.load({ fingerprint: testChange.fingerprint });
    },
    ignored: async (testChange, _args, ctx) => {
      return ctx.loaders.IgnoredChangeLoader.load({
        projectId: testChange.project.id,
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
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
  Mutation: {
    ignoreChange: async (_root, { input }, ctx) => {
      return runChangeMutaton(
        {
          changeId: input.changeId,
          accountSlug: input.accountSlug,
          user: ctx.auth?.user ?? null,
        },
        async ({ changeIdPayload, project, user }) => {
          const isIgnored = Boolean(
            await IgnoredChange.query().findOne({
              projectId: project.id,
              fingerprint: changeIdPayload.fingerprint,
              testId: changeIdPayload.testId,
            }),
          );
          if (!isIgnored) {
            await transaction(async (trx) => {
              await Promise.all([
                IgnoredChange.query(trx).insert({
                  projectId: project.id,
                  testId: changeIdPayload.testId,
                  fingerprint: changeIdPayload.fingerprint,
                }),
                AuditTrail.query(trx).insert({
                  date: new Date().toISOString(),
                  projectId: project.id,
                  testId: changeIdPayload.testId,
                  userId: user.id,
                  fingerprint: changeIdPayload.fingerprint,
                  action: "files.ignored",
                }),
              ]);
            });
          }
        },
      );
    },
    unignoreChange: async (_root, { input }, ctx) => {
      return runChangeMutaton(
        {
          changeId: input.changeId,
          accountSlug: input.accountSlug,
          user: ctx.auth?.user ?? null,
        },
        async ({ changeIdPayload, project, user }) => {
          const isIgnored = Boolean(
            await IgnoredChange.query().findOne({
              projectId: project.id,
              testId: changeIdPayload.testId,
              fingerprint: changeIdPayload.fingerprint,
            }),
          );
          if (isIgnored) {
            await transaction(async (trx) => {
              await Promise.all([
                IgnoredChange.query(trx)
                  .where({
                    projectId: project.id,
                    testId: changeIdPayload.testId,
                    fingerprint: changeIdPayload.fingerprint,
                  })
                  .delete(),
                AuditTrail.query(trx).insert({
                  date: new Date().toISOString(),
                  projectId: project.id,
                  testId: changeIdPayload.testId,
                  userId: user.id,
                  fingerprint: changeIdPayload.fingerprint,
                  action: "files.unignored",
                }),
              ]);
            });
          }
        },
      );
    },
  },
};

export type TestChangeObject = {
  project: Project;
  testId: string;
  fingerprint: string;
};

export type TestMetrics = {
  series: () => Promise<ITestMetrics["series"]>;
  all: () => Promise<ITestMetrics["all"]>;
};

async function runChangeMutaton(
  context: {
    changeId: string;
    accountSlug: string;
    user: User | null;
  },
  run: (props: {
    changeIdPayload: TestChangeIdPayload;
    project: Project;
    user: User;
  }) => Promise<void>,
): Promise<TestChangeObject> {
  const { changeId, accountSlug, user } = context;
  const changeIdPayload = safeParseTestChangeId(changeId);

  if (!changeIdPayload) {
    throw notFound("Test change not found");
  }

  const project = await Project.query()
    .joinRelated("account")
    .where("account.slug", accountSlug)
    .whereILike("projects.name", changeIdPayload.projectName)
    .first();

  if (!project) {
    throw notFound("Project not found");
  }

  const permissions = await project.$getPermissions(user);

  if (!permissions.includes("review")) {
    throw forbidden(
      "You do not have permission to ignore test changes in this project",
    );
  }

  invariant(user, "User should be defined because of permissions check");

  await run({ changeIdPayload, project, user });

  return {
    project,
    fingerprint: changeIdPayload.fingerprint,
    testId: changeIdPayload.testId,
  };
}
