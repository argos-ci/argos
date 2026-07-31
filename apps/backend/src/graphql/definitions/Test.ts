import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { TestNotificationSubscription } from "@/database/models";
import { queryTestChanges } from "@/database/services/test";
import { getStartDateFromPeriod, getTestSeriesMetrics } from "@/metrics/test";
import { getProjectMemberIds } from "@/project/members";
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
    "Comments posted on this test"
    comments: [Comment!]!
    "Whether the current user is subscribed to this test's notifications"
    subscribed: Boolean!
    "Users with access to this test's project (can be mentioned in comments)"
    members: [User!]!
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

      const [project, result] = await Promise.all([
        ctx.loaders.Project.load(test.projectId),
        queryTestChanges({
          projectId: test.projectId,
          testId: test.id,
          from,
          ignored: ignored ?? null,
          offset: after,
          limit: first,
        }),
      ]);

      invariant(project);

      return paginateResult({
        result: {
          total: result.total,
          results: result.fingerprints.map((fingerprint): TestChangeObject => ({
            project,
            testId: test.id,
            fingerprint,
          })),
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
    comments: async (test, _args, ctx) => {
      return ctx.loaders.TestComments.load({
        testId: test.id,
        viewerUserId: ctx.auth?.user.id ?? null,
      });
    },
    subscribed: async (test, _args, ctx) => {
      if (!ctx.auth) {
        return false;
      }
      const subscription = await TestNotificationSubscription.query().findOne({
        testId: test.id,
        userId: ctx.auth.user.id,
      });
      return subscription?.isSubscribed() ?? false;
    },
    members: async (test, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }
      const project = await ctx.loaders.Project.load(test.projectId);
      invariant(project, "Project not found");
      const userIds = await getProjectMemberIds(project);
      const accounts = await Promise.all(
        userIds.map((userId) =>
          ctx.loaders.AccountFromRelation.load({ userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
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
