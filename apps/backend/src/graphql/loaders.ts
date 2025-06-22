import { invariant } from "@argos/util/invariant";
import DataLoader from "dataloader";
import { memoize } from "lodash-es";
import type { ModelClass } from "objection";

import { knex } from "@/database";
import {
  Account,
  AutomationActionRun,
  AutomationRun,
  Build,
  BuildAggregatedStatus,
  BuildReview,
  File,
  GithubAccount,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  GitlabProject,
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
} from "@/database/models/index.js";
import { getAppOctokit, GhApiInstallation } from "@/github/index.js";
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

function AutomationActionRuns() {
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
          const result = await octokit.apps.getInstallation({
            installation_id: input.installationId,
          });
          if (!result.data.account || !("login" in result.data.account)) {
            return null;
          }
          return result.data;
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

function createChangeOccurencesLoader(): (
  from: string,
) => DataLoader<{ testId: string; fileId: string }, number, string> {
  return memoize(
    (
      from: string,
    ): DataLoader<{ testId: string; fileId: string }, number, string> =>
      new DataLoader<{ testId: string; fileId: string }, number, string>(
        async (pairs) => {
          // Extract all testIds and fileIds for the WHERE clause
          const testIds = [...new Set(pairs.map((p) => p.testId))];
          const fileIds = [...new Set(pairs.map((p) => p.fileId))];

          const rows = await knex.raw<{
            rows: { testId: string; fileId: string; count: number }[];
          }>(
            `
            select
              tsc."testId",
              tsc."fileId",
              sum(tsc.value) as count
            from test_stats_changes tsc
            where tsc."testId" = any(:testIds)
              and tsc."fileId" = any(:fileIds)
              and tsc."date" >= :from::timestamp
            group by tsc."testId", tsc."fileId"
          `,
            { fileIds, testIds, from },
          );

          // Index results for O(1) lookup
          const map = new Map(
            rows.rows.map((row) => [
              `${row.testId}-${row.fileId}`,
              Number(row.count),
            ]),
          );

          // Return counts in the order of input keys
          return pairs.map(
            (pair) => map.get(`${pair.testId}-${pair.fileId}`) ?? 0,
          );
        },
        { cacheKeyFn: (input) => `${input.testId}-${input.fileId}` },
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
  { fileId: string },
  {
    totalOccurences: number;
    lastSeenDiff: ScreenshotDiff;
    firstSeenDiff: ScreenshotDiff;
  },
  string
> {
  return memoize((from: string, testId: string) => {
    return new DataLoader<
      {
        fileId: string;
      },
      {
        totalOccurences: number;
        lastSeenDiff: ScreenshotDiff;
        firstSeenDiff: ScreenshotDiff;
      },
      string
    >(
      async (pairs) => {
        const fileIds = [...new Set(pairs.map((p) => p.fileId))];

        const totalOccurencesQuery = knex.raw<{
          rows: { fileId: string; total: number }[];
        }>(
          `
            SELECT tsc."fileId", sum(tsc.value) as total FROM test_stats_changes tsc
                WHERE tsc."testId" = :testId
                AND tsc."fileId" = any(:fileIds)
                AND tsc."date" >= :from
                GROUP BY tsc."fileId"
          `,
          { testId, fileIds, from },
        );

        const diffQuery = ScreenshotDiff.query()
          .select("screenshot_diffs.*")
          .distinctOn("screenshot_diffs.fileId")
          .joinRelated("build")
          .where("screenshot_diffs.testId", testId)
          .whereIn("screenshot_diffs.fileId", fileIds)
          .where("screenshot_diffs.score", ">", 0)
          .where("build.type", "reference")
          .where("build.createdAt", ">=", from)
          .whereNotNull("screenshot_diffs.fileId")
          .orderBy("screenshot_diffs.fileId");

        const lastSeenQuery = diffQuery
          .clone()
          .orderBy("screenshot_diffs.createdAt", "desc");

        const firstSeenQuery = diffQuery
          .clone()
          .orderBy("screenshot_diffs.createdAt", "asc");

        const [lastSeenRows, firstSeenRows, totalOccurencesRows] =
          await Promise.all([
            lastSeenQuery,
            firstSeenQuery,
            totalOccurencesQuery,
          ]);

        const totalOccurencesMap = new Map(
          totalOccurencesRows.rows.map((row) => [
            row.fileId,
            Number(row.total),
          ]),
        );
        const lastSeenMap = new Map(
          lastSeenRows.map((diff) => [diff.fileId, diff]),
        );
        const firstSeenMap = new Map(
          firstSeenRows.map((diff) => [diff.fileId, diff]),
        );
        return pairs.map((pair) => {
          const totalOccurences = totalOccurencesMap.get(pair.fileId) ?? 0;
          const lastSeenDiff = lastSeenMap.get(pair.fileId) ?? null;
          const firstSeenDiff = firstSeenMap.get(pair.fileId) ?? null;
          invariant(lastSeenDiff, "Last seen diff should not be null");
          invariant(firstSeenDiff, "First seen diff should not be null");
          return {
            totalOccurences,
            lastSeenDiff,
            firstSeenDiff,
          };
        });
      },
      { cacheKeyFn: (input) => JSON.stringify(input) },
    );
  });
}

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  AccountFromRelation: createAccountFromRelationLoader(),
  AutomationActionRuns: AutomationActionRuns(),
  Build: createModelLoader(Build),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  BuildUniqueReviews: createBuildUniqueReviewsLoader(),
  getChangesOccurencesLoader: createChangeOccurencesLoader(),
  File: createModelLoader(File),
  GhApiInstallation: createGhApiInstallationLoader(),
  GithubAccount: createModelLoader(GithubAccount),
  GithubInstallation: createModelLoader(GithubInstallation),
  GithubPullRequest: createModelLoader(GithubPullRequest),
  GithubRepository: createModelLoader(GithubRepository),
  GitlabProject: createModelLoader(GitlabProject),
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
});
