import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import DataLoader from "dataloader";
import { memoize } from "lodash-es";
import type { ModelClass } from "objection";

import { getPresences, type UserPresence } from "@/auth/presence";
import {
  filterVisibleComments,
  getVisibleMediaCommentsQuery,
  getVisibleTestCommentsQuery,
} from "@/comment/getVisibleComments";
import { knex } from "@/database";
import {
  Account,
  AccountSubscriptionStatus,
  AuditTrail,
  AutomationActionRun,
  AutomationRun,
  Build,
  BuildRequestedReviewer,
  BuildReview,
  Comment,
  CommentMention,
  CommentNotificationSubscription,
  CommentReaction,
  Deployment,
  DeploymentAlias,
  DiscordWebhook,
  File,
  GithubAccount,
  GithubAccountMember,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  GitlabProject,
  Media,
  MediaDiff,
  MediaVersion,
  IgnoredChange,
  Model,
  MsTeamsWebhook,
  Plan,
  Project,
  ProjectDomain,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  SlackInstallation,
  StaffTeamContact,
  Team,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import type { ProjectPermission } from "@/database/models/Project";
import {
  getAccountPeriodUsages,
  type AccountPeriodUsage,
} from "@/database/services/period-usage";
import {
  getLatestReferenceBuildIds,
  getTestChangesStats,
  getTestsSeenDiffs,
  type TestChangeStats,
} from "@/database/services/test";
import {
  checkOctokitErrorStatus,
  getAppOctokit,
  GhApiInstallation,
} from "@/github";
import { getMediaPairKey, getOppositeMediaState } from "@/media/pair";
import { MAX_PULL_REQUEST_MEDIAS, queryProjectMedia } from "@/media/query";
import { getLatestMediaVersions } from "@/media/version";
import { getTestAllMetrics } from "@/metrics/test";

import { ISignupSource, ITestStatus } from "./__generated__/resolver-types";

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

function createLatestProductionDeploymentByProjectLoader() {
  return new DataLoader<string, Deployment | null>(async (projectIds) => {
    const latestDeployments = await Deployment.query()
      .whereIn("projectId", projectIds)
      .where("environment", "production")
      .distinctOn("projectId")
      .orderBy("projectId")
      .orderBy("createdAt", "desc")
      .orderBy("id", "desc");
    const latestDeploymentsMap: Record<string, Deployment> = {};
    for (const deployment of latestDeployments) {
      latestDeploymentsMap[deployment.projectId] = deployment;
    }
    return projectIds.map((id) => latestDeploymentsMap[id] ?? null);
  });
}

function createProductionInternalProjectDomainByProjectLoader() {
  return new DataLoader<string, ProjectDomain | null>(async (projectIds) => {
    const projectDomains = await ProjectDomain.query()
      .whereIn("projectId", projectIds as string[])
      .where({
        environment: "production",
        internal: true,
      });
    const projectDomainsMap: Record<string, ProjectDomain> = {};
    for (const projectDomain of projectDomains) {
      projectDomainsMap[projectDomain.projectId] = projectDomain;
    }
    return projectIds.map((id) => projectDomainsMap[id] ?? null);
  });
}

function createLatestDeploymentByProjectAndCommitLoader() {
  return new DataLoader<
    { projectId: string; commitShas: string[] },
    Deployment | null,
    string
  >(
    async (keys) => {
      if (keys.length === 0) {
        return [];
      }

      const valuesSql = keys.map(() => "(?::bigint, ?::text[])").join(", ");
      const bindings = keys.flatMap((key) => [key.projectId, key.commitShas]);

      const rows = await Deployment.query()
        .select(
          Deployment.raw(`lookup."projectId" as "lookupProjectId"`),
          Deployment.raw(`lookup."commitShas" as "lookupCommitShas"`),
          "deployments.*",
        )
        .from(
          Deployment.raw(
            `(values ${valuesSql}) as lookup("projectId", "commitShas")`,
            bindings,
          ),
        )
        .joinRaw(
          `
            join lateral (
              select *
              from "deployments"
              where "deployments"."projectId" = lookup."projectId"
                and "deployments"."commitSha" = any(lookup."commitShas")
              order by "deployments"."createdAt" desc, "deployments"."id" desc
              limit 1
            ) as deployments on true
          `,
        );

      const deploymentsByKey = new Map<string, Deployment>();
      for (const row of rows as Array<
        Deployment & {
          lookupProjectId: string | number;
          lookupCommitShas: string[];
        }
      >) {
        deploymentsByKey.set(
          `${String(row.lookupProjectId)}:${row.lookupCommitShas.join(",")}`,
          row,
        );
      }

      return keys.map((key) => {
        return (
          deploymentsByKey.get(
            `${key.projectId}:${key.commitShas.join(",")}`,
          ) ?? null
        );
      });
    },
    {
      cacheKeyFn: (key) => `${key.projectId}:${key.commitShas.join(",")}`,
    },
  );
}

function createDeploymentAliasesByDeploymentIdLoader() {
  return new DataLoader<string, DeploymentAlias[]>(async (deploymentIds) => {
    const aliases = await DeploymentAlias.query()
      .whereIn("deploymentId", deploymentIds as string[])
      .orderBy("deploymentId", "asc")
      .orderByRaw(
        `case "type" when 'domain' then 0 when 'branch' then 1 end asc`,
      )
      .orderBy("alias", "asc");

    const aliasesByDeploymentId: Record<string, DeploymentAlias[]> = {};
    for (const alias of aliases) {
      const deploymentAliases =
        aliasesByDeploymentId[alias.deploymentId] ??
        (aliasesByDeploymentId[alias.deploymentId] = []);
      deploymentAliases.push(alias);
    }

    return deploymentIds.map((deploymentId) => {
      return aliasesByDeploymentId[deploymentId] ?? [];
    });
  });
}

function createLatestBuildByProjectAndCommitLoader() {
  return new DataLoader<
    { projectId: string; commitSha: string },
    Build | null,
    string
  >(
    async (keys) => {
      if (keys.length === 0) {
        return [];
      }

      const valuesSql = keys.map(() => "(?::bigint, ?::text)").join(", ");
      const bindings = keys.flatMap((key) => [key.projectId, key.commitSha]);

      const rows = await Build.query()
        .select(
          Build.raw(`lookup."projectId" as "lookupProjectId"`),
          Build.raw(`lookup."commitSha" as "lookupCommitSha"`),
          "builds.*",
        )
        .from(
          Build.raw(
            `(values ${valuesSql}) as lookup("projectId", "commitSha")`,
            bindings,
          ),
        )
        .joinRaw(
          `
            join lateral (
              select "builds".*
              from "builds"
              left join "screenshot_buckets" as "compareScreenshotBucket"
                on "compareScreenshotBucket"."id" = "builds"."compareScreenshotBucketId"
              where "builds"."projectId" = lookup."projectId"
                and (
                  "builds"."prHeadCommit" = lookup."commitSha"
                  or "compareScreenshotBucket"."commit" = lookup."commitSha"
                )
              order by "builds"."createdAt" desc, "builds"."id" desc
              limit 1
            ) as builds on true
          `,
        );

      const buildsByKey = new Map<string, Build>();
      for (const row of rows as Array<
        Build & { lookupProjectId: string | number; lookupCommitSha: string }
      >) {
        buildsByKey.set(
          `${String(row.lookupProjectId)}:${row.lookupCommitSha}`,
          row,
        );
      }

      return keys.map((key) => {
        return buildsByKey.get(`${key.projectId}:${key.commitSha}`) ?? null;
      });
    },
    {
      cacheKeyFn: (key) => `${key.projectId}:${key.commitSha}`,
    },
  );
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

/**
 * Loads a user's team role on a project identified by its account slug and
 * name. Batches across users: it resolves each distinct project's team once,
 * then fetches every requested team membership in a single query — so a list of
 * mentionable users or reviewers costs one query, not one per user.
 */
function createProjectTeamUserLevelLoader() {
  type Key = { accountSlug: string; projectName: string; userId: string };
  const projectKey = (k: { accountSlug: string; projectName: string }) =>
    `${k.accountSlug}\0${k.projectName}`;
  return new DataLoader<Key, TeamUser["userLevel"] | null, string>(
    async (keys) => {
      // Resolve the team behind each distinct project once.
      const projects = new Map<
        string,
        { accountSlug: string; projectName: string }
      >();
      for (const key of keys) {
        projects.set(projectKey(key), {
          accountSlug: key.accountSlug,
          projectName: key.projectName,
        });
      }
      // Resolve every referenced account in one query, keyed by slug.
      const accountSlugs = [
        ...new Set([...projects.values()].map((p) => p.accountSlug)),
      ];
      const accounts = accountSlugs.length
        ? await Account.query()
            .whereIn("slug", accountSlugs)
            .select("id", "slug", "teamId")
        : [];
      const accountBySlug = new Map(accounts.map((a) => [a.slug, a]));

      // Resolve every referenced project in one query, using a composite
      // (accountId, name) `in (...)` so the count is independent of the batch.
      const projectTuples: [string, string][] = [];
      for (const { accountSlug, projectName } of projects.values()) {
        const account = accountBySlug.get(accountSlug);
        if (account?.teamId) {
          projectTuples.push([account.id, projectName]);
        }
      }
      const existingProjects = projectTuples.length
        ? await Project.query()
            .whereIn(["accountId", "name"], projectTuples)
            .select("accountId", "name")
        : [];
      const existingProjectKeys = new Set(
        existingProjects.map(
          (project) => `${project.accountId}\0${project.name}`,
        ),
      );

      // A project's team is its account's team, but only when the project
      // actually exists under that account (mirrors the per-project lookup).
      const teamIdByProject = new Map<string, string | null>();
      for (const [id, { accountSlug, projectName }] of projects) {
        const account = accountBySlug.get(accountSlug);
        const exists =
          account?.teamId != null &&
          existingProjectKeys.has(`${account.id}\0${projectName}`);
        teamIdByProject.set(id, exists ? (account?.teamId ?? null) : null);
      }

      // Fetch every requested membership across the involved teams at once.
      const teamIds = [
        ...new Set(
          [...teamIdByProject.values()].filter(
            (id): id is string => id != null,
          ),
        ),
      ];
      const userIds = [...new Set(keys.map((key) => key.userId))];
      const teamUsers =
        teamIds.length > 0 && userIds.length > 0
          ? await TeamUser.query()
              .whereIn("teamId", teamIds)
              .whereIn("userId", userIds)
              .select("teamId", "userId", "userLevel")
          : [];
      const levelByMembership = new Map<string, TeamUser["userLevel"]>();
      for (const teamUser of teamUsers) {
        levelByMembership.set(
          `${teamUser.teamId}\0${teamUser.userId}`,
          teamUser.userLevel,
        );
      }

      return keys.map((key) => {
        const teamId = teamIdByProject.get(projectKey(key));
        if (!teamId) {
          return null;
        }
        return levelByMembership.get(`${teamId}\0${key.userId}`) ?? null;
      });
    },
    {
      cacheKeyFn: (input) =>
        `${input.accountSlug}\0${input.projectName}\0${input.userId}`,
    },
  );
}

function createMsTeamsWebhooksByAccountIdLoader() {
  return new DataLoader<string, MsTeamsWebhook[]>(async (accountIds) => {
    const webhooks = await MsTeamsWebhook.query()
      .whereIn("accountId", accountIds as string[])
      .orderBy("name");
    const webhooksMap = webhooks.reduce<Record<string, MsTeamsWebhook[]>>(
      (map, webhook) => ({
        ...map,
        [webhook.accountId]: [...(map[webhook.accountId] || []), webhook],
      }),
      {},
    );
    return accountIds.map((accountId) => webhooksMap[accountId] ?? []);
  });
}

function createDiscordWebhooksByAccountIdLoader() {
  return new DataLoader<string, DiscordWebhook[]>(async (accountIds) => {
    const webhooks = await DiscordWebhook.query()
      .whereIn("accountId", accountIds as string[])
      .orderBy("name");
    const webhooksMap = webhooks.reduce<Record<string, DiscordWebhook[]>>(
      (map, webhook) => ({
        ...map,
        [webhook.accountId]: [...(map[webhook.accountId] || []), webhook],
      }),
      {},
    );
    return accountIds.map((accountId) => webhooksMap[accountId] ?? []);
  });
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

function createTeamMembersByTeamIdLoader() {
  return new DataLoader<string, TeamUser[]>(async (teamIds) => {
    const members = await TeamUser.query()
      .withGraphJoined("user.account")
      .whereIn("team_users.teamId", teamIds as string[]);

    const membersByTeamId = new Map<string, TeamUser[]>();
    for (const teamId of teamIds) {
      membersByTeamId.set(teamId, []);
    }

    for (const member of members) {
      const teamId = String(member.teamId);
      const list = membersByTeamId.get(teamId) ?? [];
      list.push(member);
      membersByTeamId.set(teamId, list);
    }

    return teamIds.map((teamId) => membersByTeamId.get(teamId) ?? []);
  });
}

function createTeamMembersCountByTeamIdLoader() {
  return new DataLoader<string, number>(async (teamIds) => {
    const rows = await TeamUser.query()
      .select("teamId")
      .count("* as count")
      .whereIn("teamId", teamIds as string[])
      .groupBy("teamId");

    const counts = new Map<string, number>();
    for (const row of rows as unknown as Array<{
      teamId: string | number;
      count: string | number;
    }>) {
      counts.set(String(row.teamId), Number(row.count) || 0);
    }

    return teamIds.map((teamId) => counts.get(String(teamId)) ?? 0);
  });
}

function createProjectBuildsCountByProjectIdLoader() {
  return new DataLoader<string, number>(async (projectIds) => {
    const rows = await Build.query()
      .select("projectId")
      .count("* as count")
      .whereIn("projectId", projectIds as string[])
      .groupBy("projectId");

    const counts = new Map<string, number>();
    for (const row of rows as unknown as Array<{
      projectId: string | number;
      count: string | number;
    }>) {
      counts.set(String(row.projectId), Number(row.count) || 0);
    }

    return projectIds.map((projectId) => counts.get(String(projectId)) ?? 0);
  });
}

function createAccountLast30DaysScreenshotsByAccountIdLoader() {
  return new DataLoader<string, number>(async (accountIds) => {
    const rows = await Build.query()
      .join("projects", "projects.id", "builds.projectId")
      .select("projects.accountId")
      .select(
        knex.raw(`sum(coalesce((builds.stats->>'total')::int, 0)) as total`),
      )
      .whereIn("projects.accountId", accountIds as string[])
      .whereRaw(`builds."createdAt" >= now() - interval '30 days'`)
      .groupBy("projects.accountId");

    const totals = new Map<string, number>();
    for (const row of rows as unknown as Array<{
      accountId: string | number;
      total: string | number | null;
    }>) {
      totals.set(String(row.accountId), Number(row.total) || 0);
    }

    return accountIds.map((accountId) => totals.get(String(accountId)) ?? 0);
  });
}

function createAccountLastBuildDateByAccountIdLoader() {
  return new DataLoader<string, Date | null>(async (accountIds) => {
    const rows = await Build.query()
      .join("projects", "projects.id", "builds.projectId")
      .select("projects.accountId")
      .select(knex.raw(`max(builds."createdAt") as "lastBuildDate"`))
      .whereIn("projects.accountId", accountIds as string[])
      .groupBy("projects.accountId");

    const datesByAccountId = new Map<string, Date | null>();
    for (const row of rows as unknown as Array<{
      accountId: string | number;
      lastBuildDate: string | Date | null;
    }>) {
      const raw = row.lastBuildDate;
      datesByAccountId.set(String(row.accountId), raw ? new Date(raw) : null);
    }

    return accountIds.map(
      (accountId) => datesByAccountId.get(String(accountId)) ?? null,
    );
  });
}

/**
 * What an account has done since it was created: how much it built, and when it
 * first got a check build — one compared to a baseline, as opposed to an orphan
 * one. That last date is the moment the account first sees a visual diff, which
 * is what Argos is for, and the clearest marker that it activated.
 */
export type AccountActivation = {
  projectsCount: number;
  buildsCount: number;
  screenshotsCount: number;
  firstComparisonAt: Date | null;
};

const EMPTY_ACCOUNT_ACTIVATION: AccountActivation = {
  projectsCount: 0,
  buildsCount: 0,
  screenshotsCount: 0,
  firstComparisonAt: null,
};

function createAccountActivationByAccountIdLoader() {
  return new DataLoader<string, AccountActivation>(async (accountIds) => {
    // Left join so accounts that created projects but never built still get a
    // row. `count(distinct)` is required on projects: the join to builds
    // multiplies project rows.
    const rows = await Project.query()
      .leftJoin("builds", "builds.projectId", "projects.id")
      .select("projects.accountId")
      .select(
        knex.raw(`count(distinct projects.id) as "projectsCount"`),
        knex.raw(`count(builds.id) as "buildsCount"`),
        knex.raw(
          `sum(coalesce((builds.stats->>'total')::int, 0)) as "screenshotsCount"`,
        ),
        knex.raw(
          `min(builds."createdAt") filter (where builds.type = 'check') as "firstComparisonAt"`,
        ),
      )
      .whereIn("projects.accountId", accountIds as string[])
      .groupBy("projects.accountId");

    const activationByAccountId = new Map<string, AccountActivation>();
    for (const row of rows as unknown as Array<{
      accountId: string | number;
      projectsCount: string | number;
      buildsCount: string | number;
      screenshotsCount: string | number | null;
      firstComparisonAt: string | Date | null;
    }>) {
      activationByAccountId.set(String(row.accountId), {
        projectsCount: Number(row.projectsCount) || 0,
        buildsCount: Number(row.buildsCount) || 0,
        screenshotsCount: Number(row.screenshotsCount) || 0,
        firstComparisonAt: row.firstComparisonAt
          ? new Date(row.firstComparisonAt)
          : null,
      });
    }

    return accountIds.map(
      (accountId) =>
        activationByAccountId.get(String(accountId)) ??
        EMPTY_ACCOUNT_ACTIVATION,
    );
  });
}

/**
 * Batches the billing usage that the staff trial pipeline reads per team.
 *
 * Without it, every row would resolve its own subscription and run its own
 * aggregate over `screenshot_buckets` — the exact N+1 the loaders around it
 * exist to prevent, on a list that has no upper bound on its row count.
 */
function createAccountPeriodUsageByAccountIdLoader() {
  return new DataLoader<string, AccountPeriodUsage | null>(
    async (accountIds) => {
      const uniqueAccountIds = [...new Set(accountIds as string[])];
      const accounts = await Account.query().findByIds(uniqueAccountIds);
      const usageByAccountId = await getAccountPeriodUsages(accounts);
      return accountIds.map(
        (accountId) => usageByAccountId.get(accountId) ?? null,
      );
    },
  );
}

/** An owner of a team, as needed to write to them. */
type TeamOwner = {
  id: string;
  name: string | null;
  email: string | null;
  signupSource: ISignupSource | null;
  signupSourceDetail: string | null;
};

function createTeamOwnersByTeamIdLoader() {
  return new DataLoader<string, TeamOwner[]>(async (teamIds) => {
    // The display name lives on the owner's personal account, the address on
    // the user, so both are joined in one pass. The account join is left: an
    // owner without one still has an address, and dropping them would silently
    // shorten the recipient list.
    const rows = await TeamUser.query()
      .join("users", "users.id", "team_users.userId")
      .leftJoin("accounts", "accounts.userId", "users.id")
      .select(
        "team_users.teamId",
        "users.id as userId",
        "users.email",
        "users.signupSource",
        "users.signupSourceDetail",
        "accounts.name",
      )
      .whereIn("team_users.teamId", teamIds as string[])
      .where("team_users.userLevel", "owner");

    const ownersByTeamId = new Map<string, TeamOwner[]>();
    for (const row of rows as unknown as Array<{
      teamId: string | number;
      userId: string | number;
      email: string | null;
      signupSource: string | null;
      signupSourceDetail: string | null;
      name: string | null;
    }>) {
      const teamId = String(row.teamId);
      const owners = ownersByTeamId.get(teamId) ?? [];
      owners.push({
        id: String(row.userId),
        name: row.name,
        email: row.email,
        signupSource: row.signupSource as ISignupSource | null,
        signupSourceDetail: row.signupSourceDetail,
      });
      ownersByTeamId.set(teamId, owners);
    }

    return teamIds.map((teamId) => ownersByTeamId.get(String(teamId)) ?? []);
  });
}

function createStaffTeamContactByTeamIdLoader() {
  return new DataLoader<string, StaffTeamContact | null>(async (teamIds) => {
    const contacts = await StaffTeamContact.query().whereIn(
      "teamId",
      teamIds as string[],
    );
    const contactByTeamId = new Map(
      contacts.map((contact) => [contact.teamId, contact]),
    );
    return teamIds.map((teamId) => contactByTeamId.get(String(teamId)) ?? null);
  });
}

function createAccountSubscriptionStatusByAccountIdLoader() {
  return new DataLoader<string, AccountSubscriptionStatus | null>(
    async (accountIds) => {
      const uniqueAccountIds = [...new Set(accountIds as string[])];
      const accounts = await Account.query().findByIds(uniqueAccountIds);
      const accountById = new Map(
        accounts.map((account) => [account.id, account]),
      );
      const statusesByAccountId =
        await Account.getSubscriptionStatuses(accounts);
      return accountIds.map((accountId) => {
        if (!accountById.has(accountId)) {
          return null;
        }
        return statusesByAccountId.get(accountId) ?? null;
      });
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
            if (checkOctokitErrorStatus(404, error)) {
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

/**
 * Loads the comments visible to a given viewer on a build. A comment is visible
 * when it is standalone (no review), belongs to a submitted review, or belongs
 * to the viewer's own pending (draft) review — draft comments stay hidden from
 * everyone but their author until the review is submitted.
 */
function createBuildPublishedCommentsLoader() {
  return new DataLoader<
    { buildId: string; viewerUserId: string | null },
    Comment[],
    string
  >(
    async (inputs) => {
      const buildIds = inputs.map((input) => input.buildId);
      // A single request carries one viewer, so all inputs share it.
      const viewerUserId = inputs[0]?.viewerUserId ?? null;
      const comments = await filterVisibleComments(
        Comment.query().whereIn("buildId", buildIds),
        viewerUserId,
      ).orderBy("createdAt", "asc");
      const commentsMap = comments.reduce<Record<string, Comment[]>>(
        (map, comment) => {
          invariant(comment.buildId, "Build comments have a buildId");
          const array = map[comment.buildId] ?? [];
          array.push(comment);
          map[comment.buildId] = array;
          return map;
        },
        {},
      );
      return inputs.map((input) => commentsMap[input.buildId] ?? []);
    },
    {
      cacheKeyFn: (input) => `${input.buildId}:${input.viewerUserId ?? ""}`,
    },
  );
}

/**
 * Counts the comments visible to a given viewer on a build, replies included.
 * The build list only needs the number, so it counts in SQL rather than
 * reusing {@link createBuildPublishedCommentsLoader}, which would ship every
 * comment's content for a page of builds.
 */
function createBuildCommentsCountLoader() {
  return new DataLoader<
    { buildId: string; viewerUserId: string | null },
    number,
    string
  >(
    async (inputs) => {
      const buildIds = inputs.map((input) => input.buildId);
      // A single request carries one viewer, so all inputs share it.
      const viewerUserId = inputs[0]?.viewerUserId ?? null;
      const rows = (await filterVisibleComments(
        Comment.query().whereIn("buildId", buildIds),
        viewerUserId,
      )
        .select("buildId")
        .count("* as count")
        .groupBy("buildId")) as unknown as Array<{
        buildId: string;
        count: string | number;
      }>;
      const counts = new Map(
        rows.map((row) => [row.buildId, Number(row.count) || 0]),
      );
      return inputs.map((input) => counts.get(input.buildId) ?? 0);
    },
    {
      cacheKeyFn: (input) => `${input.buildId}:${input.viewerUserId ?? ""}`,
    },
  );
}

/**
 * Loads the comments posted on a media, capped per media — see
 * {@link getVisibleMediaCommentsQuery}, shared with the REST endpoint.
 */
function createMediaCommentsLoader() {
  return new DataLoader<
    { mediaId: string; viewerUserId: string | null },
    Comment[],
    string
  >(
    async (inputs) => {
      const mediaIds = inputs.map((input) => input.mediaId);
      // A single request carries one viewer, so all inputs share it.
      const viewerUserId = inputs[0]?.viewerUserId ?? null;
      const comments = await getVisibleMediaCommentsQuery({
        mediaIds,
        viewerUserId,
      });
      const commentsMap = comments.reduce<Record<string, Comment[]>>(
        (map, comment) => {
          invariant(comment.mediaId, "Media comments have a mediaId");
          const array = map[comment.mediaId] ?? [];
          array.push(comment);
          map[comment.mediaId] = array;
          return map;
        },
        {},
      );
      return inputs.map((input) => commentsMap[input.mediaId] ?? []);
    },
    {
      cacheKeyFn: (input) => `${input.mediaId}:${input.viewerUserId ?? ""}`,
    },
  );
}

/** The newest uploaded version of a media, batched across a request. */
function createLatestMediaVersionLoader() {
  return new DataLoader<string, MediaVersion | null>(async (mediaIds) => {
    const latest = await getLatestMediaVersions([...mediaIds]);
    return mediaIds.map((mediaId) => latest.get(mediaId) ?? null);
  });
}

/** Every uploaded version of a media, newest first — the version picker. */
function createMediaVersionsLoader() {
  return new DataLoader<string, MediaVersion[]>(async (mediaIds) => {
    const versions = await MediaVersion.query()
      .whereIn("mediaId", [...mediaIds])
      .whereNotNull("uploadedAt")
      .orderBy("number", "desc");
    const byMediaId = versions.reduce<Record<string, MediaVersion[]>>(
      (map, version) => {
        const array = map[version.mediaId] ?? [];
        array.push(version);
        map[version.mediaId] = array;
        return map;
      },
      {},
    );
    return mediaIds.map((mediaId) => byMediaId[mediaId] ?? []);
  });
}

/**
 * What a viewer's membership grants them on a project, once per request.
 *
 * The check is two queries and every media field that gates on "is this viewer
 * a member" runs it — including one now reached per *version*, where the answer
 * cannot differ between them. Caching is the whole point here; the calls are
 * still made one by one, because the check reads a `Project` instance rather
 * than an id.
 */
function createProjectMembershipPermissionsLoader() {
  return new DataLoader<
    { project: Project; user: User | null },
    ProjectPermission[],
    string
  >(
    async (inputs) =>
      Promise.all(
        inputs.map((input) =>
          Project.getMembershipPermissions(input.project, input.user),
        ),
      ),
    {
      cacheKeyFn: (input) => `${input.project.id}:${input.user?.id ?? ""}`,
    },
  );
}

/**
 * Everything published to one pull request, as one media's sidebar sees it.
 *
 * Keyed on what decides the answer rather than on the media asking: every media
 * in the list shares this project and this pull request, so each of them would
 * otherwise re-run the same query and get the same rows back.
 */
function createPullRequestMediaLoader() {
  return new DataLoader<
    {
      projectId: string;
      githubPullRequestId: string;
      /** False for a viewer without membership, who sees only public media. */
      includeTeamOnly: boolean;
    },
    Media[],
    string
  >(
    async (inputs) =>
      Promise.all(
        inputs.map((input) => {
          const query = queryProjectMedia({
            projectIds: [input.projectId],
            filters: { githubPullRequestId: input.githubPullRequestId },
            order: "asc",
          }).limit(MAX_PULL_REQUEST_MEDIAS);
          if (!input.includeTeamOnly) {
            query.where("media.visibility", "public");
          }
          // Expiry is not filtered here, matching the REST list: a version can
          // expire between this query and the click, and the share page already
          // has one state for a media that is no longer there.
          return query;
        }),
      ),
    {
      cacheKeyFn: (input) =>
        `${input.projectId}:${input.githubPullRequestId}:${input.includeTeamOnly}`,
    },
  );
}

/**
 * Every comparison a version took part in, on either side of it.
 *
 * Keyed on the version rather than the media because that is how the rows are
 * keyed: a version is compared against whatever the other half's newest was
 * when it landed, and re-uploading either half writes another row rather than
 * replacing this one. Batched because the share page asks for the comparison of
 * every version it lists at once.
 */
function createMediaVersionDiffsLoader() {
  return new DataLoader<string, MediaDiff[]>(async (versionIds) => {
    const ids = [...versionIds];
    const diffs = await MediaDiff.query()
      .whereIn("beforeMediaVersionId", ids)
      .orWhereIn("afterMediaVersionId", ids);
    return ids.map((versionId) =>
      diffs.filter(
        (diff) =>
          diff.beforeMediaVersionId === versionId ||
          diff.afterMediaVersionId === versionId,
      ),
    );
  });
}

/**
 * The other half of a media's before/after pair.
 *
 * The batched form of `findMediaCounterpart`: same pairing tuple, built once
 * per request instead of one query per media. Both go through
 * {@link getMediaPairKey}, so they cannot drift apart.
 */
function createMediaCounterpartLoader() {
  return new DataLoader<string, Media | null>(async (mediaIds) => {
    const media = await Media.query().whereIn("id", [...mediaIds]);
    const paired = media.filter((item) => item.state !== null);

    if (paired.length === 0) {
      return mediaIds.map(() => null);
    }

    const candidates = await Media.query()
      .whereIn(
        "name",
        paired.map((item) => item.name),
      )
      .whereIn(
        "projectId",
        paired.map((item) => item.projectId),
      )
      .whereNotNull("state");

    const byKey = new Map(
      candidates.map((item) => [getMediaPairKey(item), item]),
    );
    const byId = new Map(media.map((item) => [item.id, item]));

    return mediaIds.map((mediaId) => {
      const item = byId.get(mediaId);
      if (!item?.state) {
        return null;
      }
      const opposite = getOppositeMediaState(item.state);
      return byKey.get(getMediaPairKey({ ...item, state: opposite })) ?? null;
    });
  });
}

/**
 * Loads the comments posted on a test, capped per test — see
 * {@link getVisibleTestCommentsQuery}, shared with the REST endpoint.
 */
function createTestCommentsLoader() {
  return new DataLoader<
    { testId: string; viewerUserId: string | null },
    Comment[],
    string
  >(
    async (inputs) => {
      const testIds = inputs.map((input) => input.testId);
      // A single request carries one viewer, so all inputs share it.
      const viewerUserId = inputs[0]?.viewerUserId ?? null;
      const comments = await getVisibleTestCommentsQuery({
        testIds,
        viewerUserId,
      });
      const commentsMap = comments.reduce<Record<string, Comment[]>>(
        (map, comment) => {
          invariant(comment.testId, "Test comments have a testId");
          const array = map[comment.testId] ?? [];
          array.push(comment);
          map[comment.testId] = array;
          return map;
        },
        {},
      );
      return inputs.map((input) => commentsMap[input.testId] ?? []);
    },
    {
      cacheKeyFn: (input) => `${input.testId}:${input.viewerUserId ?? ""}`,
    },
  );
}

function createCommentReactionsLoader() {
  return new DataLoader<string, CommentReaction[]>(async (commentIds) => {
    const reactions = await CommentReaction.query()
      .whereIn("commentId", commentIds as string[])
      .orderBy("createdAt", "asc");
    const reactionsMap = reactions.reduce<Record<string, CommentReaction[]>>(
      (map, reaction) => {
        const array = map[reaction.commentId] ?? [];
        array.push(reaction);
        map[reaction.commentId] = array;
        return map;
      },
      {},
    );
    return commentIds.map((id) => reactionsMap[id] ?? []);
  });
}

function createCommentMentionedUserIdsLoader() {
  return new DataLoader<string, string[]>(async (commentIds) => {
    const mentions = await CommentMention.query()
      .whereIn("commentId", commentIds as string[])
      .where("type", "user")
      .whereNotNull("mentionedUserId")
      .select("commentId", "mentionedUserId");
    const map = mentions.reduce<Record<string, string[]>>((acc, mention) => {
      if (!mention.mentionedUserId) {
        return acc;
      }
      const array = acc[mention.commentId] ?? [];
      array.push(mention.mentionedUserId);
      acc[mention.commentId] = array;
      return acc;
    }, {});
    return commentIds.map((id) => map[id] ?? []);
  });
}

/**
 * Loads whether the request's viewer follows a comment thread, keyed by root
 * comment id.
 *
 * `Comment.threadSubscribed` is resolved for every comment an activity feed
 * renders, so without batching a feed costs one subscription query per comment.
 * Replies share their root's key, which also collapses a whole thread to a
 * single entry.
 */
function createCommentThreadSubscribedLoader() {
  return new DataLoader<
    { threadId: string; viewerUserId: string },
    boolean,
    string
  >(
    async (inputs) => {
      const threadIds = inputs.map((input) => input.threadId);
      // A single request carries one viewer, so all inputs share it.
      const viewerUserId = inputs[0]?.viewerUserId;
      invariant(viewerUserId, "Loader called without a viewer");
      const subscriptions = await CommentNotificationSubscription.query()
        .whereIn("commentId", threadIds)
        .where("userId", viewerUserId);
      const subscribed = new Set(
        subscriptions
          .filter((subscription) => subscription.isSubscribed())
          .map((subscription) => subscription.commentId),
      );
      return inputs.map((input) => subscribed.has(input.threadId));
    },
    {
      cacheKeyFn: (input) => `${input.threadId}:${input.viewerUserId}`,
    },
  );
}

function createBuildReviewsLoader() {
  return new DataLoader<string, BuildReview[]>(async (inputs) => {
    const reviews = await BuildReview.query()
      .whereIn("buildId", inputs as string[])
      .whereNot("state", "pending")
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

function createBuildRequestedReviewersLoader() {
  return new DataLoader<string, BuildRequestedReviewer[]>(async (inputs) => {
    const reviewers = await BuildRequestedReviewer.query()
      .whereIn("buildId", inputs as string[])
      .orderBy("createdAt", "asc");
    const reviewersMap = reviewers.reduce<
      Record<string, BuildRequestedReviewer[]>
    >((map, reviewer) => {
      const array = map[reviewer.buildId] ?? [];
      array.push(reviewer);
      map[reviewer.buildId] = array;
      return map;
    }, {});
    return inputs.map((id) => reviewersMap[id] ?? []);
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
    {
      // Spelled out rather than `JSON.stringify(input)` so the key does not
      // depend on property order — `queryActiveTests` primes this loader and
      // has to produce the exact same key as the `Test.metrics` resolver.
      cacheKeyFn: (input) =>
        [
          input.testId,
          input.from?.toISOString() ?? "",
          input.to?.toISOString() ?? "",
        ].join("|"),
    },
  );
}

function createTestChangeStatsLoader(): (
  from: string,
  testId: string,
) => DataLoader<{ fingerprint: string }, TestChangeStats, string> {
  return memoize((from: string, testId: string) => {
    return new DataLoader<{ fingerprint: string }, TestChangeStats, string>(
      async (pairs) => {
        const fingerprints = [...new Set(pairs.map((p) => p.fingerprint))];
        const stats = await getTestChangesStats({
          testId,
          fingerprints,
          from: new Date(from),
        });
        const statsByFingerprint = new Map(
          fingerprints.map((fingerprint, index) => [
            fingerprint,
            stats[index] ?? null,
          ]),
        );
        return pairs.map((pair) => {
          const pairStats = statsByFingerprint.get(pair.fingerprint) ?? null;
          invariant(pairStats, "Stats should be loaded for every fingerprint");
          return pairStats;
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

/**
 * Loads the most recent diff carrying a given change fingerprint, across every
 * period and every build type.
 *
 * `TestChangeStats` deliberately scopes its diffs to a metrics period and to
 * reference builds; an ignored change that stopped occurring has no such diff,
 * so it needs this unscoped lookup to still render a screenshot and a date.
 */
function createLatestChangeDiffLoader() {
  return new DataLoader<
    { testId: string; fingerprint: string },
    ScreenshotDiff | null,
    string
  >(
    async (changes) => {
      const rows = await ScreenshotDiff.query()
        .select("screenshot_diffs.*")
        // The ordering below puts the newest diff of each pair first, so
        // DISTINCT ON keeps exactly that one.
        .distinctOn("screenshot_diffs.testId", "screenshot_diffs.fingerprint")
        .whereIn(
          ["screenshot_diffs.testId", "screenshot_diffs.fingerprint"],
          changes.map(({ testId, fingerprint }) => [testId, fingerprint]),
        )
        .whereNotNull("screenshot_diffs.fileId")
        .orderBy([
          { column: "screenshot_diffs.testId" },
          { column: "screenshot_diffs.fingerprint" },
          { column: "screenshot_diffs.id", order: "desc" },
        ]);

      const diffByKey = new Map(
        rows.map((diff) => [`${diff.testId}|${diff.fingerprint}`, diff]),
      );

      return changes.map(
        ({ testId, fingerprint }) =>
          diffByKey.get(`${testId}|${fingerprint}`) ?? null,
      );
    },
    { cacheKeyFn: (input) => JSON.stringify(input) },
  );
}

/**
 * Counts how many times a change reappeared in auto-approved builds since a
 * per-change date — for ignored changes, since they were ignored. Each key
 * carries its own `from`, so this cannot reuse `getChangesTotalOccurrences`.
 */
function createChangeOccurrencesSinceLoader() {
  return new DataLoader<
    { testId: string; fingerprint: string; from: Date },
    number,
    string
  >(
    async (changes) => {
      const result = await knex.raw<{
        rows: {
          testId: string;
          fingerprint: string;
          from: Date;
          total: string;
        }[];
      }>(
        // The join casts the *parameters* to bigint rather than the column to
        // text: casting `tsf."testId"` would make the (testId, fingerprint,
        // date) primary key unusable and turn this into a full table scan.
        `
        SELECT
          c."testId"::text as "testId",
          c."fingerprint",
          c."from",
          coalesce(sum(tsf.value), 0) as total
        FROM unnest(:testIds::bigint[], :fingerprints::text[], :froms::timestamptz[])
          AS c("testId", "fingerprint", "from")
        LEFT JOIN test_stats_fingerprints tsf
          ON tsf."testId" = c."testId"
          AND tsf.fingerprint = c."fingerprint"
          AND tsf.date >= c."from"
        GROUP BY c."testId", c."fingerprint", c."from"
        `,
        {
          testIds: changes.map((change) => change.testId),
          fingerprints: changes.map((change) => change.fingerprint),
          froms: changes.map((change) => change.from.toISOString()),
        },
      );

      const totalByKey = new Map(
        result.rows.map((row) => [
          `${row.testId}|${row.fingerprint}|${new Date(row.from).getTime()}`,
          Number(row.total),
        ]),
      );

      return changes.map(
        ({ testId, fingerprint, from }) =>
          totalByKey.get(`${testId}|${fingerprint}|${from.getTime()}`) ?? 0,
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

/**
 * A test is "ongoing" when it still appears in the latest reference build of its
 * build name, and "removed" otherwise.
 *
 * The latest reference builds come from the skip scan in `queryActiveTests`.
 * Resolving them here with `DISTINCT ON (projectId, name)` instead meant reading
 * every reference build of every project on the way — the exact scan that
 * `getLatestReferenceBuildIds` exists to avoid.
 */
function createTestStatusLoader() {
  return new DataLoader<
    {
      projectId: string;
      testId: string;
    },
    ITestStatus,
    string
  >(
    async (pairs) => {
      if (pairs.length === 0) {
        return [];
      }
      const projectIds = Array.from(new Set(pairs.map((p) => p.projectId)));
      const testIds = Array.from(new Set(pairs.map((p) => p.testId)));

      return Sentry.startSpan(
        {
          name: "TestStatusLoader",
          attributes: {
            "argos.project.count": projectIds.length,
            "argos.test.count": testIds.length,
          },
        },
        async () => {
          const latestBuilds = await getLatestReferenceBuildIds(projectIds);
          if (latestBuilds.length === 0) {
            return pairs.map(() => ITestStatus.Removed);
          }
          const projectIdByBuildId = new Map(
            latestBuilds.map((build) => [build.id, build.projectId]),
          );

          const rows = (await ScreenshotDiff.query()
            .distinct("buildId", "testId")
            .whereRaw(`"buildId" = any(:buildIds::bigint[])`, {
              buildIds: latestBuilds.map((build) => build.id),
            })
            .whereRaw(`"testId" = any(:testIds::bigint[])`, {
              testIds,
            })) as unknown as { buildId: string; testId: string }[];

          const activeKeySet = new Set(
            rows.map(
              (row) => `${projectIdByBuildId.get(row.buildId)}:${row.testId}`,
            ),
          );

          return pairs.map(({ projectId, testId }) =>
            activeKeySet.has(`${projectId}:${testId}`)
              ? ITestStatus.Ongoing
              : ITestStatus.Removed,
          );
        },
      );
    },
    { cacheKeyFn: (input) => `${input.projectId}:${input.testId}` },
  );
}

function createSeenDiffsLoader() {
  return new DataLoader(getTestsSeenDiffs);
}

type LatestCompareScreenshot = Screenshot | null;

function createLatestCompareScreenshotLoader() {
  return new DataLoader<string, LatestCompareScreenshot>(async (testIds) => {
    if (testIds.length === 0) {
      return [];
    }

    return Sentry.startSpan(
      {
        name: "LatestCompareScreenshotLoader",
        attributes: { "argos.test.count": testIds.length },
      },
      () => loadLatestCompareScreenshots(testIds),
    );
  });
}

async function loadLatestCompareScreenshots(
  testIds: readonly string[],
): Promise<LatestCompareScreenshot[]> {
  const valuesSql = testIds.map(() => "(?::bigint)").join(", ");

  const rows = await Screenshot.query()
    .select(Screenshot.raw(`t."testId" as "testId"`), "screenshots.*")
    .from(Screenshot.raw(`(values ${valuesSql}) as t("testId")`, testIds))
    .joinRaw(
      `
    join lateral (
      select sd."compareScreenshotId"
      from "screenshot_diffs" sd
      where sd."testId" = t."testId"
        and sd."compareScreenshotId" is not null
      order by sd."createdAt" desc
      limit 1
    ) as sd on true
    `,
    )
    .join("screenshots", "screenshots.id", "sd.compareScreenshotId");

  const index = new Map(testIds.map((testId, i) => [testId, i]));
  const results: LatestCompareScreenshot[] = testIds.map(() => null);

  for (const row of rows as any[]) {
    const i = index.get(row.testId);
    if (i === undefined) {
      continue;
    }
    results[i] = row;
  }

  return results;
}

function createPresenceLoader() {
  return new DataLoader<string, UserPresence | null>(async (userIds) =>
    getPresences(userIds as string[]),
  );
}

/**
 * Whether the two users in each pair share a team (or are the same user).
 * Batches every requested pair into a single membership query — so a card list
 * full of comment authors costs one query, not one per author.
 */
function createUsersShareTeamLoader() {
  return new DataLoader<{ aUserId: string; bUserId: string }, boolean, string>(
    async (pairs) => {
      const userIds = [
        ...new Set(pairs.flatMap((pair) => [pair.aUserId, pair.bUserId])),
      ];
      const rows = userIds.length
        ? await TeamUser.query()
            .whereIn("userId", userIds)
            .select("userId", "teamId")
        : [];
      const teamIdsByUser = new Map<string, Set<string>>();
      for (const row of rows) {
        const set = teamIdsByUser.get(row.userId) ?? new Set<string>();
        set.add(row.teamId);
        teamIdsByUser.set(row.userId, set);
      }
      return pairs.map(({ aUserId, bUserId }) => {
        if (aUserId === bUserId) {
          return true;
        }
        const aTeamIds = teamIdsByUser.get(aUserId);
        const bTeamIds = teamIdsByUser.get(bUserId);
        if (!aTeamIds || !bTeamIds) {
          return false;
        }
        for (const teamId of aTeamIds) {
          if (bTeamIds.has(teamId)) {
            return true;
          }
        }
        return false;
      });
    },
    { cacheKeyFn: (input) => `${input.aUserId}:${input.bUserId}` },
  );
}

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  Presence: createPresenceLoader(),
  UsersShareTeam: createUsersShareTeamLoader(),
  AccountFromRelation: createAccountFromRelationLoader(),
  ProjectTeamUserLevel: createProjectTeamUserLevelLoader(),
  AutomationRunActionRuns: createAutomationRunActionRunsLoader(),
  MsTeamsWebhooksByAccountId: createMsTeamsWebhooksByAccountIdLoader(),
  DiscordWebhooksByAccountId: createDiscordWebhooksByAccountIdLoader(),
  Build: createModelLoader(Build),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  ProjectBuildsCountByProjectId: createProjectBuildsCountByProjectIdLoader(),
  AccountLast30DaysScreenshotsByAccountId:
    createAccountLast30DaysScreenshotsByAccountIdLoader(),
  AccountLastBuildDateByAccountId:
    createAccountLastBuildDateByAccountIdLoader(),
  AccountActivationByAccountId: createAccountActivationByAccountIdLoader(),
  AccountPeriodUsageByAccountId: createAccountPeriodUsageByAccountIdLoader(),
  TeamOwnersByTeamId: createTeamOwnersByTeamIdLoader(),
  StaffTeamContactByTeamId: createStaffTeamContactByTeamIdLoader(),
  AccountSubscriptionStatusByAccountId:
    createAccountSubscriptionStatusByAccountIdLoader(),
  BuildPublishedComments: createBuildPublishedCommentsLoader(),
  BuildCommentsCount: createBuildCommentsCountLoader(),
  MediaComments: createMediaCommentsLoader(),
  LatestMediaVersion: createLatestMediaVersionLoader(),
  MediaVersions: createMediaVersionsLoader(),
  MediaVersion: createModelLoader(MediaVersion),
  MediaVersionDiffs: createMediaVersionDiffsLoader(),
  PullRequestMedia: createPullRequestMediaLoader(),
  ProjectMembershipPermissions: createProjectMembershipPermissionsLoader(),
  MediaCounterpart: createMediaCounterpartLoader(),
  Media: createModelLoader(Media),
  TestComments: createTestCommentsLoader(),
  CommentReactions: createCommentReactionsLoader(),
  CommentMentionedUserIds: createCommentMentionedUserIdsLoader(),
  CommentThreadSubscribed: createCommentThreadSubscribedLoader(),
  BuildReview: createModelLoader(BuildReview),
  BuildReviews: createBuildReviewsLoader(),
  BuildRequestedReviewers: createBuildRequestedReviewersLoader(),
  DeploymentAliasesByDeploymentId:
    createDeploymentAliasesByDeploymentIdLoader(),
  LatestBuildByProjectAndCommit: createLatestBuildByProjectAndCommitLoader(),
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
  LatestChangeDiffLoader: createLatestChangeDiffLoader(),
  ChangeOccurrencesSinceLoader: createChangeOccurrencesSinceLoader(),
  LatestAutomationRun: createLatestAutomationRunLoader(),
  LatestDeploymentByProjectAndCommit:
    createLatestDeploymentByProjectAndCommitLoader(),
  LatestProductionDeploymentByProject:
    createLatestProductionDeploymentByProjectLoader(),
  LatestProjectBuild: createLatestProjectBuildLoader(),
  LatestCompareScreenshotLoader: createLatestCompareScreenshotLoader(),
  Plan: createModelLoader(Plan),
  Project: createModelLoader(Project),
  ProductionInternalProjectDomainByProject:
    createProductionInternalProjectDomainByProjectLoader(),
  SlackInstallation: createModelLoader(SlackInstallation),
  Screenshot: createModelLoader(Screenshot),
  ScreenshotBucket: createModelLoader(ScreenshotBucket),
  ScreenshotDiff: createModelLoader(ScreenshotDiff),
  SeenDiffsLoader: createSeenDiffsLoader(),
  Team: createModelLoader(Team),
  TeamMembersCountByTeamId: createTeamMembersCountByTeamIdLoader(),
  TeamMembersByTeamId: createTeamMembersByTeamIdLoader(),
  TeamUserFromGithubMember: createTeamUserFromGithubAccountMemberLoader(),
  Test: createModelLoader(Test),
  TestStatusLoader: createTestStatusLoader(),
  getChangeStatsLoader: createTestChangeStatsLoader(),
  TestAllMetrics: createTestAllMetricsLoader(),
  TestAuditTrailLoader: createTestAuditTrailLoader(),
  User: createModelLoader(User),
});
