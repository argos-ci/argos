import { invariant } from "@argos/util/invariant";
import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import { knex } from "@/database";
import {
  Account,
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

function createChangeOccurencesLoader() {
  return new DataLoader<{ testId: string; fileId: string }, number, string>(
    async (pairs) => {
      // Extract all testIds and fileIds for the WHERE clause
      const testIds = [...new Set(pairs.map((p) => p.testId))];
      const fileIds = [...new Set(pairs.map((p) => p.fileId))];

      const rows = await knex.raw<{
        rows: { testId: string; fileId: string; count: number }[];
      }>(
        `
        SELECT
          sd."testId" AS "testId",
          sd."fileId" AS "fileId",
          COUNT(*) AS count
        FROM screenshot_diffs sd
        JOIN builds b ON sd."buildId" = b.id
        WHERE sd."fileId" = ANY(:fileIds)
          AND sd."testId" = ANY(:testIds)
          AND sd."createdAt" > now() - interval '7 days'
          AND b.type = 'reference'
        GROUP BY sd."testId", sd."fileId"
      `,
        { fileIds, testIds },
      );

      // Index results for O(1) lookup
      const map = new Map(
        rows.rows.map((row) => [
          `${row.testId}-${row.fileId}`,
          Number(row.count),
        ]),
      );

      // Return counts in the order of input keys
      return pairs.map((pair) => map.get(`${pair.testId}-${pair.fileId}`) ?? 0);
    },
    { cacheKeyFn: (input) => `${input.testId}-${input.fileId}` },
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

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  AccountFromRelation: createAccountFromRelationLoader(),
  Build: createModelLoader(Build),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  BuildUniqueReviews: createBuildUniqueReviewsLoader(),
  ChangeOccurencesLoader: createChangeOccurencesLoader(),
  File: createModelLoader(File),
  GhApiInstallation: createGhApiInstallationLoader(),
  GithubAccount: createModelLoader(GithubAccount),
  GithubInstallation: createModelLoader(GithubInstallation),
  GithubPullRequest: createModelLoader(GithubPullRequest),
  GithubRepository: createModelLoader(GithubRepository),
  GitlabProject: createModelLoader(GitlabProject),
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
  TestAllMetrics: createTestAllMetricsLoader(),
  User: createModelLoader(User),
});
