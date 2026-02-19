import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Account,
  AutomationRule,
  Build,
  BUILD_EXPIRATION_DELAY_MS,
  GithubInstallation,
  GitlabProject,
  Project,
  ProjectUser,
  Screenshot,
  ScreenshotDiff,
  Test,
  User,
} from "@/database/models";
import {
  checkProjectName,
  resolveProjectName,
} from "@/database/services/project";
import { notifyDiscord } from "@/discord";
import { getInstallationOctokit } from "@/github/client";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab";
import { getOrCreateGithubRepository } from "@/graphql/services/github";
import { getStartDateFromPeriod } from "@/metrics/test";

import {
  IBuildStatus,
  IProjectPermission,
  IProjectUserLevel,
  IResolvers,
} from "../__generated__/resolver-types";
import { deleteProject, getAdminProject } from "../services/project";
import { safeParseTestId } from "../services/test";
import { badUserInput, forbidden, unauthenticated } from "../util";
import { paginateResult } from "./PageInfo";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum SummaryCheck {
    always
    never
    auto
  }

  enum GitHubAppType {
    main
    light
  }

  type GithubRepository implements Node {
    id: ID!
    defaultBranch: String!
    private: Boolean!
  }

  type ProjectContributorConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ProjectContributor!]!
  }

  type AutoIgnoreSettings {
    changes: Int!
  }

  input AutoIgnoreSettingsInput {
    changes: Int!
  }

  type ProjectContributor implements Node {
    id: ID!
    user: User!
    project: Project!
    level: ProjectUserLevel!
  }

  enum ProjectUserLevel {
    admin
    reviewer
    viewer
  }

  enum ProjectPermission {
    admin
    review
    view_settings
    view
  }

  input BuildsFilterInput {
    name: String
    type: [BuildType!]
    status: [BuildStatus!]
  }

  input TestsFilterInput {
    buildName: String
    search: String
  }

  type Project implements Node {
    id: ID!
    name: String!
    token: String
    "Total number of builds for this project"
    buildsCount: Int!
    "Builds associated to the project"
    builds(
      first: Int = 30
      after: Int = 0
      filters: BuildsFilterInput
    ): BuildConnection!
    "A single build linked to the project"
    build(number: Int!): Build
    "Test associated to the project"
    test(id: ID!): Test
    "Latest auto-approved build"
    latestAutoApprovedBuild: Build
    "Latest build"
    latestBuild: Build
    "Determine permissions of the current user"
    permissions: [ProjectPermission!]!
    "Owner of the project"
    account: Account!
    "Repository associated to the project"
    repository: Repository
    "Default base branch"
    defaultBaseBranch: String!
    "Default base branch edited by the user"
    customDefaultBaseBranch: String
    "Glob pattern for auto-approved branches"
    autoApprovedBranchGlob: String!
    "Glob pattern for auto-approved branches edited by the user"
    customAutoApprovedBranchGlob: String
    "Check if the project is public or not"
    public: Boolean!
    "Override repository's Github privacy"
    private: Boolean
    "Current month used screenshots"
    currentPeriodScreenshots: ScreenshotsCount!
    "Total screenshots used"
    totalScreenshots: Int!
    "Project slug"
    slug: String!
    "Pull request comment enabled"
    prCommentEnabled: Boolean!
    "Summary check"
    summaryCheck: SummaryCheck!
    "Build names"
    buildNames: [String!]!
    "Contributors"
    contributors(after: Int = 0, first: Int = 30): ProjectContributorConnection!
    "Automation rules"
    automationRules(after: Int = 0, first: Int = 30): AutomationRuleConnection!
    "Default user access level applied to members that are not contributors"
    defaultUserLevel: ProjectUserLevel
    "Auto ignore configuration for flaky changes"
    autoIgnore: AutoIgnoreSettings
    "List all tests in a project"
    tests(
      after: Int = 0
      first: Int = 30
      period: MetricsPeriod!
      filters: TestsFilterInput
    ): TestConnection!
  }

  extend type Query {
    "Get a project"
    project(accountSlug: String!, projectName: String!): Project
    "Get a project"
    projectById(id: ID!): Project
  }

  type ProjectConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Project!]!
  }

  input ImportGithubProjectInput {
    repo: String!
    owner: String!
    accountSlug: String!
    installationId: String!
  }

  input ImportGitlabProjectInput {
    gitlabProjectId: ID!
    accountSlug: String!
  }

  input UpdateProjectInput {
    id: ID!
    defaultBaseBranch: String
    autoApprovedBranchGlob: String
    private: Boolean
    name: String
    summaryCheck: SummaryCheck
    defaultUserLevel: ProjectUserLevel
    autoIgnore: AutoIgnoreSettingsInput
  }

  input TransferProjectInput {
    id: ID!
    name: String!
    targetAccountId: ID!
  }

  input LinkGithubRepositoryInput {
    projectId: ID!
    repo: String!
    owner: String!
    installationId: String!
  }

  input UnlinkGithubRepositoryInput {
    projectId: ID!
  }

  input LinkGitlabProjectInput {
    projectId: ID!
    gitlabProjectId: ID!
  }

  input UnlinkGitlabProjectInput {
    projectId: ID!
  }

  input UpdateProjectPrCommentInput {
    projectId: ID!
    enabled: Boolean!
  }

  input AddContributorToProjectInput {
    projectId: ID!
    userAccountId: ID!
    level: ProjectUserLevel!
  }

  input RemoveContributorFromProjectInput {
    projectId: ID!
    userAccountId: ID!
  }

  type RemoveContributorFromProjectPayload {
    projectContributorId: ID!
  }

  extend type Mutation {
    "Import a project from GitHub"
    importGithubProject(input: ImportGithubProjectInput!): Project!
    "Import a project from GitLab"
    importGitlabProject(input: ImportGitlabProjectInput!): Project!
    "Update Project"
    updateProject(input: UpdateProjectInput!): Project!
    "Regenerate project token"
    regenerateProjectToken(id: ID!): Project!
    "Link GitHub Repository"
    linkGithubRepository(input: LinkGithubRepositoryInput!): Project!
    "Unlink GitHub Repository"
    unlinkGithubRepository(input: UnlinkGithubRepositoryInput!): Project!
    "Link Gitlab Project"
    linkGitlabProject(input: LinkGitlabProjectInput!): Project!
    "Unlink Gitlab Project"
    unlinkGitlabProject(input: UnlinkGitlabProjectInput!): Project!
    "Transfer Project to another account"
    transferProject(input: TransferProjectInput!): Project!
    "Delete Project"
    deleteProject(id: ID!): Boolean!
    "Set project pull request comment"
    updateProjectPrComment(input: UpdateProjectPrCommentInput!): Project!
    "Add contributor to project"
    addOrUpdateProjectContributor(
      input: AddContributorToProjectInput!
    ): ProjectContributor!
    removeContributorFromProject(
      input: RemoveContributorFromProjectInput!
    ): RemoveContributorFromProjectPayload!
  }
`;

const checkGqlProjectName = async (
  args: Parameters<typeof checkProjectName>[0],
) => {
  try {
    await checkProjectName(args);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw badUserInput(error.message, { field: "name" });
    }
    throw error;
  }
};

async function notifyProjectCreation(input: {
  project: Project;
  account: Account;
  email: string | null;
  source: "GitHub" | "GitLab";
}) {
  await notifyDiscord({
    content: `
New project from ${input.account.name} (${
      input.email ?? "unknown email"
    }) imported from ${input.source}:
${input.account.slug} / ${input.project.name}
`.trim(),
  }).catch((error) => {
    Sentry.captureException(error);
  });
}

async function importGithubProject(props: {
  accountSlug: string;
  creator: User;
  repo: string;
  owner: string;
  installationId: string;
}) {
  const account = await Account.query()
    .findOne({ slug: props.accountSlug })
    .throwIfNotFound();

  const permissions = await account.$getPermissions(props.creator);

  if (!permissions.includes("admin")) {
    throw forbidden();
  }

  const installation = await GithubInstallation.query()
    .findOne({ githubId: props.installationId })
    .throwIfNotFound();

  const octokit = await getInstallationOctokit(installation);

  invariant(octokit, "Octokit not found");

  const ghRepo = await getOrCreateGithubRepository({
    octokit,
    repo: props.repo,
    owner: props.owner,
  });

  const name = await resolveProjectName({
    name: ghRepo.name,
    accountId: account.id,
  });

  const project = await Project.query().insertAndFetch({
    name,
    accountId: account.id,
    githubRepositoryId: ghRepo.id,
  });

  await notifyProjectCreation({
    project,
    email: props.creator.email,
    account,
    source: "GitHub",
  });

  return project;
}

const getOrCreateGitlabProject = async (props: {
  account: Account;
  gitlabProjectId: string;
}): Promise<GitlabProject> => {
  const client = await getGitlabClientFromAccount(props.account);
  invariant(client, "Gitlab client not found");

  const gitlabProjectId = Number(props.gitlabProjectId);

  const gitlabProject = await GitlabProject.query().findOne({
    gitlabId: gitlabProjectId,
  });

  if (gitlabProject) {
    return gitlabProject;
  }

  const glProject = await client.Projects.show(gitlabProjectId);
  invariant(glProject, "GitLab Project not found");

  if (!("default_branch" in glProject)) {
    throw badUserInput(
      `GitLab user behinds the specified access token should have a "developer" role at minimum.`,
    );
  }

  return GitlabProject.query().insertAndFetch(formatGlProject(glProject));
};

const importGitlabProject = async (props: {
  accountSlug: string;
  creator: User;
  gitlabProjectId: string;
}) => {
  const account = await Account.query()
    .findOne({ slug: props.accountSlug })
    .throwIfNotFound();

  const permissions = await account.$getPermissions(props.creator);
  if (!permissions.includes("admin")) {
    throw forbidden();
  }

  invariant(account.gitlabAccessToken, "Gitlab access token is missing");

  const glProject = await getOrCreateGitlabProject({
    account,
    gitlabProjectId: props.gitlabProjectId,
  });

  const name = await resolveProjectName({
    name: glProject.path,
    accountId: account.id,
  });

  const project = await Project.query().insertAndFetch({
    name,
    accountId: account.id,
    gitlabProjectId: glProject.id,
  });

  await notifyProjectCreation({
    project,
    email: props.creator.email,
    account,
    source: "GitLab",
  });

  return project;
};

export const resolvers: IResolvers = {
  Project: {
    buildsCount: async (project, _args, ctx) => {
      return ctx.loaders.ProjectBuildsCountByProjectId.load(project.id);
    },
    token: async (project, _args, ctx) => {
      if (!ctx.auth) {
        return null;
      }
      const permissions = await project.$getPermissions(ctx.auth.user);
      if (!permissions.includes("review")) {
        return null;
      }
      return project.token;
    },
    latestAutoApprovedBuild: async (project) => {
      const latestAutoApprovedBuild = await Build.query()
        .where("projectId", project.id)
        .where("type", "reference")
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "number", order: "desc" },
        ])
        .first();
      return latestAutoApprovedBuild ?? null;
    },
    latestBuild: async (project, _args, ctx) => {
      return ctx.loaders.LatestProjectBuild.load(project.id);
    },
    builds: async (project, { first, after, filters }) => {
      const result = await Build.query()
        .where({ projectId: project.id })
        .where((query) => {
          if (filters?.name) {
            query.where("name", filters.name);
          }
          const type = filters?.type;
          if (type) {
            query.where((qb) => {
              qb.whereIn("type", type).orWhereNull("type");
            });
          }
          const status = filters?.status;
          if (status) {
            query.where((qb) => {
              // Job status check
              if (!status.includes(IBuildStatus.Aborted)) {
                qb.whereNot("jobStatus", "aborted");
              }

              if (!status.includes(IBuildStatus.Error)) {
                qb.whereNot("jobStatus", "error");
              }

              if (!status.includes(IBuildStatus.Expired)) {
                qb.whereNot((qb) => {
                  qb.whereIn("jobStatus", ["progress", "pending"]).whereRaw(
                    `now() - "builds"."createdAt" > interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
                  );
                });
              }

              if (!status.includes(IBuildStatus.Progress)) {
                qb.whereNot((qb) => {
                  qb.where((qb) =>
                    // Job is in progress
                    // or job is complete without a conclusion, we assume it's in progress
                    qb
                      .where("jobStatus", "progress")
                      .orWhere((qb) =>
                        qb
                          .where("jobStatus", "complete")
                          .whereNull("conclusion"),
                      ),
                  ).whereRaw(
                    `now() - "builds"."createdAt" < interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
                  );
                });
              }

              if (!status.includes(IBuildStatus.Pending)) {
                qb.whereNot((qb) => {
                  qb.where("jobStatus", "pending").whereRaw(
                    `now() - "builds"."createdAt" < interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
                  );
                });
              }

              if (!status.includes(IBuildStatus.Accepted)) {
                qb.whereNotExists(
                  Build.submittedReviewQuery().where("state", "approved"),
                );
              }

              if (!status.includes(IBuildStatus.Rejected)) {
                qb.whereNotExists(
                  Build.submittedReviewQuery().where("state", "rejected"),
                );
              }

              if (!status.includes(IBuildStatus.ChangesDetected)) {
                qb.where((qb) => {
                  qb.whereNot("conclusion", "changes-detected")
                    .orWhereNull("conclusion")
                    .orWhereExists(Build.submittedReviewQuery());
                });
              }

              if (!status.includes(IBuildStatus.NoChanges)) {
                qb.where((qb) => {
                  qb.whereNot("conclusion", "no-changes")
                    .orWhereNull("conclusion")
                    .orWhereExists(Build.submittedReviewQuery());
                });
              }
            });
          }
        })
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "number", order: "desc" },
        ])
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    build: async (project, args, ctx) => {
      const build = await Build.query().findOne({
        projectId: project.id,
        number: args.number,
      });

      if (!build) {
        return null;
      }

      ctx.loaders.Build.prime(build.id, build);

      return build;
    },
    test: async (project, args, ctx) => {
      const parsed = safeParseTestId(args.id);
      if (!parsed) {
        return null;
      }
      const { testId, projectName } = parsed;
      if (project.name.toUpperCase() !== projectName) {
        return null;
      }
      const test = await ctx.loaders.Test.load(testId);
      if (!test) {
        return null;
      }
      if (test.projectId !== project.id) {
        return null;
      }
      return test;
    },
    tests: async (project, { first, after, period, filters }) => {
      const search = filters?.search?.trim();
      const latestRef = Build.query()
        .alias("b")
        .select("b.id", "b.projectId", "b.name")
        .distinctOn(["b.projectId", "b.name"])
        .where("b.type", "reference")
        .where("b.projectId", project.id)
        .orderBy("b.projectId")
        .orderBy("b.name")
        .orderBy("b.createdAt", "desc")
        .as("latest_reference_build");

      const activeTests = ScreenshotDiff.query()
        .alias("sd")
        .distinct("sd.testId")
        .join(latestRef, "latest_reference_build.id", "sd.buildId")
        .whereNotNull("sd.testId")
        .joinRelated("compareScreenshot")
        .whereNull("compareScreenshot.parentName")
        .modify((query) => {
          if (search) {
            query.whereILike("compareScreenshot.name", `%${search}%`);
          }
        })
        .as("active_tests");

      const result = await Test.query()
        .where("tests.projectId", project.id)
        .where((qb) => {
          if (filters?.buildName) {
            qb.where("tests.buildName", filters.buildName);
          }
        })
        // only ongoing
        .join(activeTests, "active_tests.testId", "tests.id")
        .orderByRaw(
          `
    (
      with
        totals as (
          select sum(tsb.value)::numeric as total
          from test_stats_builds tsb
          where tsb."testId" = "tests"."id"
            and tsb."date" >= :from::timestamp
            and tsb."date" <  :to::timestamp
        ),
        fp_agg as (
          select
            tsf."fingerprint",
            sum(tsf.value)::numeric as changes_value,
            count(*) as fp_count
          from test_stats_fingerprints tsf
          where tsf."testId" = "tests"."id"
            and tsf."date" >= :from::timestamp
            and tsf."date" <  :to::timestamp
          group by tsf."fingerprint"
        ),
        changes as (
          select
            sum(changes_value)::numeric as changes,
            count(*) filter (where fp_count = 1)::numeric as "uniqueChanges"
          from fp_agg
        )
      select
        round(
          (
            1 - (
              (
                case
                  when coalesce(changes.changes, 0) > 0
                    then 1 - changes.changes / nullif(totals.total, 0)
                  else 1
                end
              +
                case
                  when coalesce(changes.changes, 0) > 0
                    then coalesce(changes."uniqueChanges", 0) / nullif(changes.changes, 0)
                  else 1
                end
              ) / 2
            )
          ),
          2
        )
      from totals, changes
    ) desc,
    "tests"."createdAt" desc,
    "tests"."id" desc
    `,
          {
            from: getStartDateFromPeriod(period).toISOString(),
            to: new Date().toISOString(),
          },
        )
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    permissions: async (project, _args, ctx) => {
      const permissions = await project.$getPermissions(ctx.auth?.user ?? null);
      return permissions as IProjectPermission[];
    },
    account: async (project, _args, ctx) => {
      const account = await ctx.loaders.Account.load(project.accountId);
      invariant(account, "Account not found");
      return account;
    },
    repository: async (project, _args, ctx) => {
      if (project.githubRepositoryId) {
        return ctx.loaders.GithubRepository.load(project.githubRepositoryId);
      }
      if (project.gitlabProjectId) {
        return ctx.loaders.GitlabProject.load(project.gitlabProjectId);
      }
      return null;
    },
    defaultBaseBranch: async (project) => {
      return project.$getDefaultBaseBranch();
    },
    customDefaultBaseBranch: (project) => {
      return project.defaultBaseBranch;
    },
    autoApprovedBranchGlob: async (project) => {
      return project.$getAutoApprovedBranchGlob();
    },
    customAutoApprovedBranchGlob: (project) => {
      return project.autoApprovedBranchGlob;
    },
    public: async (project, _args, ctx) => {
      project.githubRepository = project.githubRepositoryId
        ? await ctx.loaders.GithubRepository.load(project.githubRepositoryId)
        : null;
      return project.$checkIsPublic();
    },
    currentPeriodScreenshots: async (project, _args, ctx) => {
      const account = await ctx.loaders.Account.load(project.accountId);
      invariant(account, "Account not found");
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodScreenshots({
        projectId: project.id,
      });
    },
    totalScreenshots: async (project) => {
      return Screenshot.query()
        .joinRelated("screenshotBucket")
        .where("screenshotBucket.projectId", project.id)
        .resultSize();
    },
    slug: async (project, _args, ctx) => {
      const account = await ctx.loaders.Account.load(project.accountId);
      invariant(account, "Account not found");
      return `${account.slug}/${project.name}`;
    },
    buildNames: async (project) => {
      const builds = await Build.query()
        .select("name")
        .distinct("name")
        .where("projectId", project.id)
        .whereRaw(`"createdAt" > now() - interval '1 month'`);
      return builds.map((build) => build.name);
    },
    contributors: async (project, args, ctx) => {
      const { first, after } = args;
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const result = await ProjectUser.query()
        .where("project_users.projectId", project.id)
        .orderByRaw(
          `(CASE WHEN project_users."userId" = ? THEN 0
     ELSE project_users."id"
     END) ASC
    `,
          ctx.auth.user.id,
        )
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    automationRules: async (project, args, ctx) => {
      const { first, after } = args;

      if (!ctx.auth) {
        throw unauthenticated();
      }

      const result = await AutomationRule.query()
        .where({ projectId: project.id, active: true })
        .orderBy("createdAt", "desc")
        .range(after, after + first - 1);

      return paginateResult({
        result,
        first,
        after,
      });
    },
  },
  Query: {
    project: async (_root, args, ctx) => {
      const project = await Project.query().joinRelated("account").findOne({
        "account.slug": args.accountSlug,
        "projects.name": args.projectName,
      });

      if (!project) {
        return null;
      }

      ctx.loaders.Project.prime(project.id, project);

      const permissions = await project.$getPermissions(ctx.auth?.user ?? null);

      if (!permissions.includes("view")) {
        return null;
      }

      return project;
    },
    projectById: async (_root, args, ctx) => {
      const project = await Project.query()
        .joinRelated("account")
        .findById(args.id);

      if (!project) {
        return null;
      }

      ctx.loaders.Project.prime(project.id, project);

      const permissions = await project.$getPermissions(ctx.auth?.user ?? null);

      if (!permissions.includes("view")) {
        return null;
      }

      return project;
    },
  },
  ProjectContributor: {
    user: async (projectUser, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: projectUser.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
    project: async (projectUser, _args, ctx) => {
      const project = await ctx.loaders.Project.load(projectUser.projectId);
      invariant(project, "Project not found");
      return project;
    },
    level: (projectUser) => projectUser.userLevel as IProjectUserLevel,
  },
  Mutation: {
    importGithubProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return importGithubProject({
        accountSlug: args.input.accountSlug,
        repo: args.input.repo,
        owner: args.input.owner,
        creator: ctx.auth.user,
        installationId: args.input.installationId,
      });
    },
    importGitlabProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return importGitlabProject({
        accountSlug: args.input.accountSlug,
        gitlabProjectId: args.input.gitlabProjectId,
        creator: ctx.auth.user,
      });
    },
    updateProject: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      const data: PartialModelObject<Project> = {};

      if (args.input.defaultBaseBranch !== undefined) {
        data.defaultBaseBranch = args.input.defaultBaseBranch ?? null;
      }

      if (args.input.autoApprovedBranchGlob !== undefined) {
        data.autoApprovedBranchGlob = args.input.autoApprovedBranchGlob ?? null;
      }

      if (args.input.private !== undefined) {
        data.private = args.input.private;
      }

      if (args.input.summaryCheck != null) {
        data.summaryCheck = args.input.summaryCheck;
      }

      if (args.input.defaultUserLevel !== undefined) {
        data.defaultUserLevel = args.input.defaultUserLevel;
      }

      if (args.input.autoIgnore !== undefined) {
        data.autoIgnore = args.input.autoIgnore;
      }

      if (args.input.name != null && project.name !== args.input.name) {
        await checkGqlProjectName({
          name: args.input.name,
          accountId: project.accountId,
        });
        data.name = args.input.name;
      }

      return project.$query().patchAndFetch(data);
    },
    linkGithubRepository: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth.user,
        withGraphFetched: "account",
      });

      invariant(project.account, "account not fetched");

      const installation = await GithubInstallation.query()
        .findOne({ githubId: args.input.installationId })
        .throwIfNotFound();

      const octokit = await getInstallationOctokit(installation);

      invariant(octokit, "Octokit not found");

      const ghRepo = await getOrCreateGithubRepository({
        octokit,
        owner: args.input.owner,
        repo: args.input.repo,
      });

      return project.$query().patchAndFetch({
        githubRepositoryId: ghRepo.id,
        gitlabProjectId: null,
      });
    },
    unlinkGithubRepository: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      return project.$query().patchAndFetch({
        githubRepositoryId: null,
      });
    },
    linkGitlabProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth.user,
        withGraphFetched: "account",
      });

      invariant(project.account, "account not fetched");
      invariant(
        project.account.gitlabAccessToken,
        "Gitlab access token is missing",
      );

      const gitlabProject = await getOrCreateGitlabProject({
        account: project.account,
        gitlabProjectId: args.input.gitlabProjectId,
      });

      return project.$query().patchAndFetch({
        gitlabProjectId: gitlabProject.id,
        githubRepositoryId: null,
      });
    },
    unlinkGitlabProject: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      return project.$query().patchAndFetch({
        gitlabProjectId: null,
      });
    },
    transferProject: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.id,
        user: ctx.auth?.user,
      });
      const { targetAccountId } = args.input;
      if (project.accountId === targetAccountId) {
        throw badUserInput("Project is already owned by this account.");
      }
      await checkGqlProjectName({
        name: args.input.name,
        accountId: targetAccountId,
      });
      return project.$query().patchAndFetch({
        accountId: targetAccountId,
        name: args.input.name,
      });
    },
    deleteProject: async (_root, args, ctx) => {
      const project = await Project.query().findById(args.id).select("id");
      if (!project) {
        return true;
      }
      await deleteProject({ id: args.id, user: ctx.auth?.user });
      return true;
    },
    updateProjectPrComment: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth.user,
      });

      return project
        .$query()
        .patchAndFetch({ prCommentEnabled: args.input.enabled });
    },
    addOrUpdateProjectContributor: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [project, userAccount] = await Promise.all([
        getAdminProject({
          id: args.input.projectId,
          user: ctx.auth.user,
        }),
        ctx.loaders.Account.load(args.input.userAccountId),
      ]);

      if (!userAccount?.userId) {
        throw badUserInput("User not found");
      }

      const projectUser = await ProjectUser.query().findOne({
        projectId: project.id,
        userId: userAccount.userId,
      });

      if (projectUser) {
        if (projectUser.userLevel !== args.input.level) {
          return projectUser
            .$query()
            .patchAndFetch({ userLevel: args.input.level });
        }

        return projectUser;
      }

      return ProjectUser.query().insertAndFetch({
        projectId: project.id,
        userId: userAccount.userId,
        userLevel: args.input.level,
      });
    },
    removeContributorFromProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [project, userAccount] = await Promise.all([
        Project.query().findById(args.input.projectId).throwIfNotFound(),
        ctx.loaders.Account.load(args.input.userAccountId),
      ]);

      invariant(userAccount?.userId, "User not found");

      const canRemove = await (async () => {
        invariant(ctx.auth, "Auth not found");
        if (ctx.auth.account.id === args.input.userAccountId) {
          return true;
        }
        const permissions = await project.$getPermissions(ctx.auth.user);
        return permissions.includes("admin");
      })();

      if (!canRemove) {
        throw forbidden();
      }

      const projectUser = await ProjectUser.query()
        .select("id")
        .findOne({
          projectId: project.id,
          userId: userAccount.userId,
        })
        .throwIfNotFound();

      const projectContributorId = projectUser.id;
      await projectUser.$query().delete();

      return { projectContributorId };
    },
    regenerateProjectToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const project = await getAdminProject({
        id: args.id,
        user: ctx.auth.user,
      });

      const token = Project.generateToken();
      return project.$query().patchAndFetch({ token });
    },
  },
};
