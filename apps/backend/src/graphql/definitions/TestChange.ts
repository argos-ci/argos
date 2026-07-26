import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Project, type AuditTrail, type User } from "@/database/models";
import {
  getChangeMutationDenial,
  ignoreChange as ignoreTestChange,
  unignoreChange as unignoreTestChange,
} from "@/database/services/ignored-change";
import { getStartDateFromPeriod } from "@/metrics/test";
import {
  formatTestChangeId,
  safeParseTestChangeId,
  type TestChangeIdPayload,
} from "@/util/test-id";

import type { Context } from "../context";
import { type IResolvers } from "../__generated__/resolver-types";
import { badUserInput, forbidden, notFound } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  A distinct change within a test: an exact diff fingerprint. This is the unit
  reviewers ignore, so ignoring one leaves other changes to the same test
  visible.
  """
  type TestChange implements Node {
    id: ID!
    "Test the change belongs to"
    test: Test!
    stats(period: MetricsPeriod!): TestChangeStats!
    """
    Most recent diff carrying this fingerprint, whatever its period or build
    type — unlike \`stats.lastSeenDiff\`, which is scoped to a metrics period and
    to auto-approved builds. Null when the diff's image is no longer available.
    """
    lastSeenDiff: ScreenshotDiff
    ignored: Boolean!
    """
    When the change was last ignored, from the audit trail. Null when the change
    has never been ignored.
    """
    ignoredAt: DateTime
    """
    Who last ignored the change — the Argos bot when auto-ignore did. Null when
    the change has never been ignored.
    """
    ignoredBy: User
    """
    Number of auto-approved builds that have shown this exact change since it
    was last ignored — how much review noise the ignore has absorbed. 0 when the
    change has never been ignored.
    """
    occurrencesSinceIgnored: Int!
    trails: [AuditTrail!]!
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

export type TestChangeObject = {
  project: Project;
  testId: string;
  fingerprint: string;
};

/**
 * Audit trail entries for this change, oldest first.
 */
async function getChangeTrails(
  testChange: TestChangeObject,
  ctx: Context,
): Promise<AuditTrail[]> {
  const trails = await ctx.loaders.TestAuditTrailLoader.load({
    projectId: testChange.project.id,
    testId: testChange.testId,
  });
  return trails.filter(
    (trail) => trail.fingerprint === testChange.fingerprint,
  );
}

/**
 * Latest `files.ignored` entry, or null when the change was never ignored. A
 * change can be ignored, unignored, then ignored again, so only the latest entry
 * describes the ignore currently in force.
 */
async function getLastIgnoredTrail(
  testChange: TestChangeObject,
  ctx: Context,
): Promise<AuditTrail | null> {
  const trails = await getChangeTrails(testChange, ctx);
  return (
    trails.findLast((trail) => trail.action === "files.ignored") ?? null
  );
}

export const resolvers: IResolvers = {
  TestChange: {
    id: (testChange) =>
      formatTestChangeId({
        projectName: testChange.project.name,
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
      }),
    test: async (testChange, _args, ctx) => {
      const test = await ctx.loaders.Test.load(testChange.testId);
      invariant(test, "Test should exist");
      return test;
    },
    stats: async (testChange, args, ctx) => {
      const { period } = args;
      const from = getStartDateFromPeriod(period);
      const ChangeStatsLoader = ctx.loaders.getChangeStatsLoader(
        from.toISOString(),
        testChange.testId,
      );
      return ChangeStatsLoader.load({ fingerprint: testChange.fingerprint });
    },
    lastSeenDiff: async (testChange, _args, ctx) => {
      return ctx.loaders.LatestChangeDiffLoader.load({
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
      });
    },
    ignored: async (testChange, _args, ctx) => {
      return ctx.loaders.IgnoredChangeLoader.load({
        projectId: testChange.project.id,
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
      });
    },
    ignoredAt: async (testChange, _args, ctx) => {
      const trail = await getLastIgnoredTrail(testChange, ctx);
      return trail ? new Date(trail.date) : null;
    },
    ignoredBy: async (testChange, _args, ctx) => {
      const trail = await getLastIgnoredTrail(testChange, ctx);
      if (!trail) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: trail.userId,
      });
      invariant(account, "Account should exist");
      return account;
    },
    occurrencesSinceIgnored: async (testChange, _args, ctx) => {
      const trail = await getLastIgnoredTrail(testChange, ctx);
      if (!trail) {
        return 0;
      }
      return ctx.loaders.ChangeOccurrencesSinceLoader.load({
        testId: testChange.testId,
        fingerprint: testChange.fingerprint,
        from: new Date(trail.date),
      });
    },
    trails: async (testChange, _args, ctx) => {
      return getChangeTrails(testChange, ctx);
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
          await ignoreTestChange({
            projectId: project.id,
            testId: changeIdPayload.testId,
            fingerprint: changeIdPayload.fingerprint,
            userId: user.id,
          });
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
          await unignoreTestChange({
            projectId: project.id,
            testId: changeIdPayload.testId,
            fingerprint: changeIdPayload.fingerprint,
            userId: user.id,
          });
        },
      );
    },
  },
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

  const denial = await getChangeMutationDenial(project, user);

  switch (denial) {
    case "forbidden":
      throw forbidden(
        "You do not have permission to ignore test changes in this project",
      );
    case "ignore-disabled":
      throw badUserInput("The ignore feature is disabled for this project.");
    case null:
      break;
    default:
      assertNever(denial);
  }

  invariant(user, "User should be defined because of permissions check");

  await run({ changeIdPayload, project, user });

  return {
    project,
    fingerprint: changeIdPayload.fingerprint,
    testId: changeIdPayload.testId,
  };
}
