import { invariant } from "@argos/util/invariant";
import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import {
  Account,
  Build,
  BuildAggregatedStatus,
  BuildStats,
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
  return new DataLoader<Build, BuildAggregatedStatus>(async (builds) =>
    Build.getAggregatedBuildStatuses(builds as Build[]),
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
  return new DataLoader<{ userId?: string; teamId?: string }, Account | null>(
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
  );
}

function createTeamUserFromGithubAccountMemberLoader() {
  return new DataLoader<
    { githubAccountId: string; githubMemberId: string },
    TeamUser | null
  >(async (githubAccountMembers) => {
    const githubAccountIds = githubAccountMembers.map((m) => m.githubAccountId);
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
  });
}

function createBuildFromCompareScreenshotBucketIdLoader() {
  return new DataLoader<string, Build | null>(
    async (compareScreenshotBucketIds) => {
      const builds = await Build.query()
        .select("builds.*")
        .joinRelated("compareScreenshotBucket")
        .whereIn(
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

function createBuildStatsLoader() {
  return new DataLoader<string, BuildStats>(async (buildIds) => {
    return Build.getStats(buildIds as string[]);
  });
}

function createGhApiInstallationLoader() {
  return new DataLoader<
    { app: GithubInstallation["app"]; installationId: number },
    GhApiInstallation | null
  >(async (inputs) => {
    return Promise.all(
      inputs.map(async (input) => {
        const octokit = getAppOctokit({ app: input.app });
        const result = await octokit.apps.getInstallation({
          installation_id: input.installationId,
        });
        if (!result.data.account || !("login" in result.data.account)) {
          return null;
        }
        return result.data;
      }),
    );
  });
}

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  AccountFromRelation: createAccountFromRelationLoader(),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  BuildStats: createBuildStatsLoader(),
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
  User: createModelLoader(User),
});
