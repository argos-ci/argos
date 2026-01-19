import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { invariant } from "@argos/util/invariant";
import DataLoader from "dataloader";
import { memoize } from "lodash-es";
import type { ModelClass } from "objection";

import { knex } from "@/database";
import {
  Account,
  AuditTrail,
  AutomationActionRun,
  AutomationRun,
  Build,
  BuildReview,
  File,
  GithubAccount,
  GithubAccountMember,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  GitlabProject,
  IgnoredChange,
  Model,
  Plan,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  SlackInstallation,
  Team,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import { checkErrorStatus, getAppOctokit, GhApiInstallation } from "@/github";
import { getTestAllMetrics } from "@/metrics/test";

function createModelLoader<TModelClass extends ModelClass<Model>>(
  Model: TModelClass,
) {
  return new DataLoader<string, InstanceType<TModelClass> | null>(
    async (ids) => {
      const models = await Model.query().findByIds(ids as string[]);
      return ids.map(
        (id) => models.find((model: Model) => model.id === id) ?? null,
      ) as InstanceType<TModelClass>[];
    },
  );
}

function createBuildAggregatedStatusLoader() {
  return new DataLoader<Build, BuildAggregatedStatus, string>(
    async (builds) => Build.getAggregatedBuildStatuses(builds as Build[]),
    { cacheKeyFn: (input) => input.id },
  );
}

function createLatestAutomationRunLoader() {
  return new DataLoader<string, AutomationRun | null>(
    async (automationRuleIds) => {
      const latestRuns = await AutomationRun.query()
        .select("*")
        .whereIn("automationRuleId", automationRuleIds as string[])
        .distinctOn("automationRuleId")
        .orderBy("automationRuleId")
        .orderBy("createdAt", "desc");
      const latestRunsMap = latestRuns.reduce<Record<string, AutomationRun>>(
        (map, run) => ({
          ...map,
          [run.automationRuleId]: run,
        }),
        {},
      );
      return automationRuleIds.map((id) => latestRunsMap[id] ?? null);
    },
  );
}

function createLatestProjectBuildLoader() {
  return new DataLoader<string, Build | null>(async (projectIds) => {
    const latestBuilds = await Build.query()
      .select("*")
      .whereIn("projectId", projectIds as string[])
      .distinctOn("projectId")
      .orderBy("projectId")
      .orderBy("createdAt", "desc");
    const latestBuildsMap: Record<string, Build> = {};
    for (const build of latestBuilds) {
      latestBuildsMap[build.projectId!] = build;
    }
    return projectIds.map((id) => latestBuildsMap[id] ?? null);
  });
}

function createAccountFromRelationLoader() {
  return new DataLoader<
    { userId?: string; teamId?: string },
    Account | null,
    string
  >(
    async (relations) => {
      const userIds = relations
        .map((r) => r.userId)
        .filter((id) => id) as string[];
      const teamIds = relations
        .map((r) => r.teamId)
        .filter((id) => id) as string[];
      if (userIds.length === 0 && teamIds.length === 0) {
        return relations.map(() => null);
      }

      const query = Account.query();
      if (userIds.length > 0) {
        query.orWhereIn("userId", userIds);
      }
      if (teamIds.length > 0) {
        query.orWhereIn("teamId", teamIds);
      }
      const accounts = await query;
      return relations.map((relation) => {
        if (relation.userId) {
          return accounts.find((a) => a.userId === relation.userId) ?? null;
        }
        if (relation.teamId) {
          return accounts.find((a) => a.teamId === relation.teamId) ?? null;
        }
        return null;
      });
    },
    { cacheKeyFn: (input) => `${input.userId}-${input.teamId}` },
  );
}

function createAutomationRunActionRunsLoader() {
  return new DataLoader<string, AutomationActionRun[]>(async (ids) => {
    const runs = await AutomationActionRun.query().whereIn(
      "automationRunId",
      ids as string[],
    );
    const runsMap = runs.reduce<Record<string, AutomationActionRun[]>>(
      (map, run) => ({
        ...map,
        [run.automationRunId]: [...(map[run.automationRunId] || []), run],
      }),
      {},
    );
    return ids.map((id) => runsMap[id] ?? []);
  });
}

function createTeamUserFromGithubAccountMemberLoader() {
  return new DataLoader<
    { githubAccountId: string; githubMemberId: string },
    TeamUser | null,
    string
  >(
    async (githubAccountMembers) => {
      const githubAccountIds = githubAccountMembers.map(
        (m) => m.githubAccountId,
      );
      const githubMemberIds = githubAccountMembers.map((m) => m.githubMemberId);
      const [teams, memberAccounts] = await Promise.all([
        Team.query()
          .select("id", "ssoGithubAccountId")
          .whereIn("ssoGithubAccountId", githubAccountIds),
        Account.query()
          .select("userId", "githubAccountId")
          .whereIn("githubAccountId", githubMemberIds),
      ]);
      const accountsByTeam = githubAccountMembers.reduce((map, member) => {
        const team = teams.find(
          (team) => team.ssoGithubAccountId === member.githubAccountId,
        );
        const account = memberAccounts.find(
          (account) => account.githubAccountId === member.githubMemberId,
        );
        if (account && team) {
          const array = map.get(team) || [];
          map.set(team, [...array, account]);
        }
        return map;
      }, new Map<Team, Account[]>());
      const teamMembers = (
        await Promise.all(
          Array.from(accountsByTeam).map(async ([team, accounts]) => {
            const userIds = accounts.map((account) => {
              invariant(account.userId);
              return account.userId;
            });
            return TeamUser.query()
              .where("teamId", team.id)
              .whereIn("userId", userIds);
          }),
        )
      ).flat();
      return githubAccountMembers.map((member) => {
        const team = teams.find(
          (team) => team.ssoGithubAccountId === member.githubAccountId,
        );
        const account = memberAccounts.find(
          (account) => account.githubAccountId === member.githubMemberId,
        );
        if (!account || !team) {
          return null;
        }
        const teamMember = teamMembers.find(
          (m) => m.teamId === team.id && m.userId === account.userId,
        );
        return teamMember ?? null;
      });
    },
    {
      cacheKeyFn: (input) => `${input.githubAccountId}-${input.githubMemberId}`,
    },
  );
}

function createGitHubAccountMemberLoader() {
  return new DataLoader<
    { githubAccountId: string; githubMemberId: string },
    GithubAccountMember | null,
    string
  >(
    async (args) => {
      const members = await GithubAccountMember.query().whereRaw(
        `
        ("githubAccountId", "githubMemberId") IN (
          ${args.map(() => "(?, ?)").join(", ")}
        )
      `,
        args.flatMap((a) => [a.githubAccountId, a.githubMemberId]),
      );
      return args.map((arg) => {
        return (
          members.find(
            (m) =>
              m.githubAccountId === arg.githubAccountId &&
              m.githubMemberId === arg.githubMemberId,
          ) ?? null
        );
      });
    },
    {
      cacheKeyFn: (input) => `${input.githubAccountId}-${input.githubMemberId}`,
    },
  );
}

function createBuildFromCompareScreenshotBucketIdLoader() {
  return new DataLoader<string, Build | null>(
    async (compareScreenshotBucketIds) => {
      const builds = await Build.query().whereIn(
        "compareScreenshotBucketId",
        compareScreenshotBucketIds as string[],
      );
      const buildsMap: Record<string, Build> = {};
      for (const build of builds) {
        buildsMap[build.compareScreenshotBucketId] = build;
      }
      return compareScreenshotBucketIds.map((id) => buildsMap[id] ?? null);
    },
  );
}

function createGhApiInstallationLoader() {
  return new DataLoader<
    { app: GithubInstallation["app"]; installationId: number; proxy: boolean },
    GhApiInstallation | null,
    string
  >(
    async (inputs) => {
      return Promise.all(
        inputs.map(async (input) => {
          const octokit = getAppOctokit({ app: input.app, proxy: input.proxy });
          try {
            const result = await octokit.apps.getInstallation({
              installation_id: input.installationId,
            });
            if (!result.data.account || !("login" in result.data.account)) {
              return null;
            }
            return result.data;
          } catch (error) {
            if (checkErrorStatus(404, error)) {
              return null;
            }
            throw error;
          }
        }),
      );
    },
    {
      cacheKeyFn: (input) =>
        `${input.app}-${input.installationId}-${input.proxy}`,
    },
  );
}

function createBuildUniqueReviewsLoader() {
  return new DataLoader<string, BuildReview[]>(async (inputs) => {
    const reviews = await BuildReview.query()
      .whereIn(
        "id",
        BuildReview.query()
          .select("id")
          .whereIn("buildId", inputs as string[])
          .distinctOn(["buildId", "userId"])
          .orderBy([
            { column: "buildId", order: "desc" },
            { column: "userId", order: "desc" },
            { column: "createdAt", order: "desc" },
          ]),
      )
      .orderBy("createdAt", "desc");
    const reviewsMap = reviews.reduce<Record<string, BuildReview[]>>(
      (map, review) => {
        const array = map[review.buildId] ?? [];
        array.push(review);
        map[review.buildId] = array;
        return map;
      },
      {},
    );
    return inputs.map((id) => reviewsMap[id] ?? []);
  });
}

function createChangeOccurrencesLoader(): (
  from: string,
) => DataLoader<{ testId: string; fingerprint: string }, number, string> {
  return memoize(
    (
      from: string,
    ): DataLoader<{ testId: string; fingerprint: string }, number, string> =>
      new DataLoader<{ testId: string; fingerprint: string }, number, string>(
        async (pairs) => {
          // Extract all testIds and fingerprints for the WHERE clause
          const testIds = [...new Set(pairs.map((p) => p.testId))];
          const fingerprints = [...new Set(pairs.map((p) => p.fingerprint))];

          const rows = await knex.raw<{
            rows: { testId: string; fingerprint: string; count: number }[];
          }>(
            `
            select
              tsf."testId",
              tsf."fingerprint",
              sum(tsf.value) as count
            from test_stats_fingerprints tsf
            where tsf."testId" = any(:testIds)
              and tsf."fingerprint" = any(:fingerprints)
              and tsf."date" >= :from::timestamp
            group by tsf."testId", tsf."fingerprint"
          `,
            { fingerprints, testIds, from },
          );

          // Index results for O(1) lookup
          const map = new Map(
            rows.rows.map((row) => [
              `${row.testId}-${row.fingerprint}`,
              Number(row.count),
            ]),
          );

          // Return counts in the order of input keys
          return pairs.map(
            (pair) => map.get(`${pair.testId}-${pair.fingerprint}`) ?? 0,
          );
        },
        { cacheKeyFn: (input) => `${input.testId}-${input.fingerprint}` },
      ),
  );
}

function createTestAllMetricsLoader() {
  return new DataLoader<
    { testId: string; from?: Date | undefined; to?: Date | undefined },
    {
      total: number;
      changes: number;
      uniqueChanges: number;
      stability: number;
      consistency: number;
      flakiness: number;
    },
    string
  >(
    async (inputs) => {
      // Group by from/to stringified for batching
      const groupMap = new Map<
        string,
        {
          from: Date | undefined;
          to: Date | undefined;
          testIds: string[];
          indexes: number[];
        }
      >();

      inputs.forEach((input, idx) => {
        const key = JSON.stringify({
          from: input.from?.toISOString(),
          to: input.to?.toISOString(),
        });
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            from: input.from,
            to: input.to,
            testIds: [],
            indexes: [],
          });
        }
        const group = groupMap.get(key);
        invariant(group, "Group has been defined just above");
        group.testIds.push(input.testId);
        group.indexes.push(idx);
      });

      // For each group, call getTestAllMetrics once
      const groupResults: Map<number, any> = new Map();
      await Promise.all(
        Array.from(groupMap.values()).map(async (group) => {
          const metrics = await getTestAllMetrics(group.testIds, {
            from: group.from,
            to: group.to,
          });
          // Map results back to the original input order
          group.testIds.forEach((_testId, i) => {
            const idx = group.indexes[i];
            invariant(idx !== undefined, "Index should be defined");
            groupResults.set(idx, metrics[i]);
          });
        }),
      );

      // Return results in the same order as inputs
      return inputs.map((_, idx) => groupResults.get(idx));
    },
    { cacheKeyFn: (input) => JSON.stringify(input) },
  );
}

function createTestChangeStatsLoader(): (
  from: string,
  testId: string,
) => DataLoader<
  { fingerprint: string },
  {
    totalOccurrences: number;
    lastSeenDiff: ScreenshotDiff;
    firstSeenDiff: ScreenshotDiff;
  },
  string
> {
  return memoize((from: string, testId: string) => {
    return new DataLoader<
      {
        fingerprint: string;
      },
      {
        totalOccurrences: number;
        lastSeenDiff: ScreenshotDiff;
        firstSeenDiff: ScreenshotDiff;
      },
      string
    >(
      async (pairs) => {
        const fingerprints = [...new Set(pairs.map((p) => p.fingerprint))];

        const totalOccurrencesQuery = knex.raw<{
          rows: { fingerprint: string; total: number }[];
        }>(
          `
            SELECT tsf."fingerprint", sum(tsf.value) as total FROM test_stats_fingerprints tsf
                WHERE tsf."testId" = :testId
                AND tsf."fingerprint" = any(:fingerprints)
                AND tsf."date" >= :from
                GROUP BY tsf."fingerprint"
          `,
          { testId, fingerprints, from },
        );

        const diffQuery = ScreenshotDiff.query()
          .select("screenshot_diffs.*")
          .distinctOn("screenshot_diffs.fingerprint")
          .joinRelated("build")
          .where("screenshot_diffs.testId", testId)
          .whereIn("screenshot_diffs.fingerprint", fingerprints)
          .where("screenshot_diffs.score", ">", 0)
          .where("build.type", "reference")
          .where("build.createdAt", ">=", from)
          .whereNotNull("screenshot_diffs.fingerprint")
          .orderBy("screenshot_diffs.fingerprint");

        const lastSeenQuery = diffQuery
          .clone()
          .orderBy("screenshot_diffs.createdAt", "desc");

        const firstSeenQuery = diffQuery
          .clone()
          .orderBy("screenshot_diffs.createdAt", "asc");

        const [lastSeenRows, firstSeenRows, totalOccurrencesRows] =
          await Promise.all([
            lastSeenQuery,
            firstSeenQuery,
            totalOccurrencesQuery,
          ]);

        const totalOccurrencesMap = new Map(
          totalOccurrencesRows.rows.map((row) => [
            row.fingerprint,
            Number(row.total),
          ]),
        );
        const lastSeenMap = new Map(
          lastSeenRows.map((diff) => [diff.fingerprint, diff]),
        );
        const firstSeenMap = new Map(
          firstSeenRows.map((diff) => [diff.fingerprint, diff]),
        );
        return pairs.map((pair) => {
          const totalOccurrences =
            totalOccurrencesMap.get(pair.fingerprint) ?? 0;
          const lastSeenDiff = lastSeenMap.get(pair.fingerprint) ?? null;
          const firstSeenDiff = firstSeenMap.get(pair.fingerprint) ?? null;
          invariant(lastSeenDiff, "Last seen diff should not be null");
          invariant(firstSeenDiff, "First seen diff should not be null");
          return {
            totalOccurrences,
            lastSeenDiff,
            firstSeenDiff,
          };
        });
      },
      { cacheKeyFn: (input) => JSON.stringify(input) },
    );
  });
}

function createIgnoredChangeLoader() {
  return new DataLoader<
    {
      projectId: string;
      testId: string;
      fingerprint: string;
    },
    boolean,
    string
  >(
    async (pairs) => {
      const rows = await IgnoredChange.query().whereIn(
        ["projectId", "testId", "fingerprint"],
        pairs.map(({ projectId, testId, fingerprint }) => [
          projectId,
          testId,
          fingerprint,
        ]),
      );

      const rowSet = new Set(
        rows.map((r) => `${r.projectId}|${r.testId}|${r.fingerprint}`),
      );

      return pairs.map(({ projectId, testId, fingerprint }) =>
        rowSet.has(`${projectId}|${testId}|${fingerprint}`),
      );
    },
    { cacheKeyFn: (input) => JSON.stringify(input) },
  );
}

function createTestAuditTrailLoader() {
  return new DataLoader<
    {
      projectId: string;
      testId: string;
    },
    AuditTrail[],
    string
  >(
    async (pairs) => {
      const rows = await AuditTrail.query()
        .whereIn(
          ["projectId", "testId"],
          pairs.map(({ projectId, testId }) => [projectId, testId]),
        )
        .orderBy("id", "asc");

      return pairs.map(({ projectId, testId }) => {
        return rows.filter(
          (row) => row.projectId === projectId && row.testId === testId,
        );
      });
    },
    { cacheKeyFn: (input) => JSON.stringify(input) },
  );
}

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  AccountFromRelation: createAccountFromRelationLoader(),
  AutomationRunActionRuns: createAutomationRunActionRunsLoader(),
  Build: createModelLoader(Build),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  BuildUniqueReviews: createBuildUniqueReviewsLoader(),
  getChangesOccurrencesLoader: createChangeOccurrencesLoader(),
  File: createModelLoader(File),
  GhApiInstallation: createGhApiInstallationLoader(),
  GithubAccount: createModelLoader(GithubAccount),
  GitHubAccountMemberLoader: createGitHubAccountMemberLoader(),
  GithubInstallation: createModelLoader(GithubInstallation),
  GithubPullRequest: createModelLoader(GithubPullRequest),
  GithubRepository: createModelLoader(GithubRepository),
  GitlabProject: createModelLoader(GitlabProject),
  IgnoredChangeLoader: createIgnoredChangeLoader(),
  LatestAutomationRun: createLatestAutomationRunLoader(),
  LatestProjectBuild: createLatestProjectBuildLoader(),
  Plan: createModelLoader(Plan),
  Project: createModelLoader(Project),
  SlackInstallation: createModelLoader(SlackInstallation),
  Screenshot: createModelLoader(Screenshot),
  ScreenshotBucket: createModelLoader(ScreenshotBucket),
  ScreenshotDiff: createModelLoader(ScreenshotDiff),
  Team: createModelLoader(Team),
  TeamUserFromGithubMember: createTeamUserFromGithubAccountMemberLoader(),
  Test: createModelLoader(Test),
  getChangeStatsLoader: createTestChangeStatsLoader(),
  TestAllMetrics: createTestAllMetricsLoader(),
  User: createModelLoader(User),
  TestAuditTrailLoader: createTestAuditTrailLoader(),
});
