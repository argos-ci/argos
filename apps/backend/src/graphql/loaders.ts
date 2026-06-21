import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { invariant } from "@argos/util/invariant";
import DataLoader from "dataloader";
import { memoize } from "lodash-es";
import type { ModelClass } from "objection";

import { getPresences, type UserPresence } from "@/auth/presence";
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
  CommentReaction,
  Deployment,
  DeploymentAlias,
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
  ProjectDomain,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  SlackInstallation,
  Team,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import {
  checkOctokitErrorStatus,
  getAppOctokit,
  GhApiInstallation,
} from "@/github";
import { getTestAllMetrics } from "@/metrics/test";

import { ITestStatus } from "./__generated__/resolver-types";

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
      const comments = await Comment.query()
        .whereIn("buildId", buildIds)
        .whereNull("deletedAt")
        .where((qb) => {
          qb.whereNull("buildReviewId").orWhereExists(
            BuildReview.query()
              .select(1)
              .whereColumn("build_reviews.id", "comments.buildReviewId")
              .where((sub) => {
                sub.whereNot("build_reviews.state", "pending");
                if (viewerUserId) {
                  sub.orWhere("build_reviews.userId", viewerUserId);
                }
              }),
          );
        })
        .orderBy("createdAt", "asc");
      const commentsMap = comments.reduce<Record<string, Comment[]>>(
        (map, comment) => {
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

      const rows = (await ScreenshotDiff.query()
        .join(
          Build.query()
            .select("id", "projectId", "name")
            .distinctOn(["projectId", "name"])
            .where("type", "reference")
            .whereIn("projectId", projectIds)
            .orderBy("projectId")
            .orderBy("name")
            .orderBy("createdAt", "desc")
            .as("latest_reference_build"),
          "latest_reference_build.id",
          "screenshot_diffs.buildId",
        )
        .whereIn("testId", testIds)
        .select("latest_reference_build.projectId", "screenshot_diffs.testId")
        .distinct()) as unknown as { projectId: string; testId: string }[];

      const activeKeySet = new Set(
        rows.map((r) => `${r.projectId}:${r.testId}`),
      );

      return pairs.map(({ projectId, testId }) =>
        activeKeySet.has(`${projectId}:${testId}`)
          ? ITestStatus.Ongoing
          : ITestStatus.Removed,
      );
    },
    { cacheKeyFn: (input) => JSON.stringify(input) },
  );
}

type SeenDiffs = {
  first: ScreenshotDiff | null;
  last: ScreenshotDiff | null;
};
function createSeenDiffsLoader() {
  return new DataLoader<string, SeenDiffs>(async (testIds) => {
    if (testIds.length === 0) {
      return [];
    }

    const valuesSql = testIds.map(() => "(?::bigint)").join(", ");

    const rows = await ScreenshotDiff.query()
      .from(ScreenshotDiff.raw(`(values ${valuesSql}) as t("testId")`, testIds))
      .joinRaw(
        `
        join lateral (
          (
            select sd.id, 'first' as kind
            from screenshot_diffs sd
            where sd."testId" = t."testId"
              and sd."fileId" is not null
            order by sd.id asc
            limit 1
          )
          union all
          (
            select sd.id, 'last' as kind
            from screenshot_diffs sd
            where sd."testId" = t."testId"
              and sd."fileId" is not null
            order by sd.id desc
            limit 1
          )
        ) pick on true
        `,
      )
      .join("screenshot_diffs", "screenshot_diffs.id", "pick.id")
      .select(
        ScreenshotDiff.raw(`t."testId"::text as "testId"`),
        "pick.kind",
        "screenshot_diffs.*",
      );

    const map = new Map<string, SeenDiffs>();
    for (const testId of testIds) {
      map.set(testId, { first: null, last: null });
    }

    for (const row of rows as any[]) {
      const entry = map.get(String(row.testId))!;
      switch (row.kind) {
        case "first": {
          entry.first = row;
          break;
        }
        case "last": {
          entry.last = row;
          break;
        }
      }
    }

    return testIds.map((id) => map.get(id)!);
  });
}

type LatestCompareScreenshot = Screenshot | null;

function createLatestCompareScreenshotLoader() {
  return new DataLoader<string, LatestCompareScreenshot>(async (testIds) => {
    if (testIds.length === 0) {
      return [];
    }

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
  });
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
  Build: createModelLoader(Build),
  BuildFromCompareScreenshotBucketId:
    createBuildFromCompareScreenshotBucketIdLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  ProjectBuildsCountByProjectId: createProjectBuildsCountByProjectIdLoader(),
  AccountLast30DaysScreenshotsByAccountId:
    createAccountLast30DaysScreenshotsByAccountIdLoader(),
  AccountLastBuildDateByAccountId:
    createAccountLastBuildDateByAccountIdLoader(),
  AccountSubscriptionStatusByAccountId:
    createAccountSubscriptionStatusByAccountIdLoader(),
  BuildPublishedComments: createBuildPublishedCommentsLoader(),
  CommentReactions: createCommentReactionsLoader(),
  CommentMentionedUserIds: createCommentMentionedUserIdsLoader(),
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
