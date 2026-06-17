import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import { isUniqueViolationError } from "@/database/error";
import {
  Account,
  AutomationRule,
  Build,
  BUILD_EXPIRATION_DELAY_MS,
  Deployment,
  GithubInstallation,
  GitlabProject,
  normalizeIgnoreConfig,
  Project,
  ProjectUser,
  Screenshot,
  User,
} from "@/database/models";
import {
  checkProjectName,
  resolveProjectName,
} from "@/database/services/project";
import { upsertProductionInternalProjectDomain } from "@/database/services/project-domain";
import { isValidPgBigInt } from "@/database/util/biginteger";
import {
  invalidateDeploymentCache,
  invalidateProjectDeploymentCache,
} from "@/deployment/invalidate";
import { notifyDiscord } from "@/discord";
import { getInstallationOctokit } from "@/github/client";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab";
import { getOrCreateGithubRepository } from "@/graphql/services/github";
import { HTTPError } from "@/util/error";

import {
  IBuildStatus,
  IDeploymentAuth,
  IProjectPermission,
  IProjectUserLevel,
  IResolvers,
} from "../__generated__/resolver-types";
import { deleteProject, getAdminProject } from "../services/project";
import { queryActiveTests, safeParseTestId } from "../services/test";
import { badUserInput, forbidden, unauthenticated } from "../util";
import { paginateResult } from "./PageInfo";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum SummaryCheck {
    always
    never
    auto
  }

  enum DeploymentAuth {
    public
    domainPrivate
    private
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

  type IgnoreConfig {
    "Whether the ignore feature is enabled for this project"
    enabled: Boolean!
    "Auto-ignore settings, null when auto-ignore (or the ignore feature) is disabled"
    autoIgnore: AutoIgnoreSettings
  }

  input IgnoreConfigInput {
    "Whether the ignore feature is enabled for this project"
    enabled: Boolean!
    "Auto-ignore settings, null to disable auto-ignore"
    autoIgnore: AutoIgnoreSettingsInput
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
    review_dismiss
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
    "Latest production deployment"
    latestProductionDeployment: Deployment
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
    "Glob pattern for production deployment branches"
    deploymentProductionBranchGlob: String!
    "Glob pattern for production deployment branches edited by the user"
    customDeploymentProductionBranchGlob: String
    "Whether deployments are accessible"
    deploymentEnabled: Boolean!
    "Deployment authentication policy"
    deploymentAuth: DeploymentAuth!
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
    "GitHub Actions OIDC authentication enabled"
    githubActionsOidcEnabled: Boolean!
    "Tokenless authentication enabled"
    tokenlessAuthEnabled: Boolean!
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
    "Ignore feature configuration"
    ignoreConfig: IgnoreConfig!
    "List all tests in a project"
    tests(
      after: Int = 0
      first: Int = 30
      period: MetricsPeriod!
      filters: TestsFilterInput
    ): TestConnection!
    "Deployments associated to the project"
    deployments(after: Int = 0, first: Int = 30): DeploymentConnection!
    "Production deployment domain"
    domain: String
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

  input CreateProjectInput {
    name: String!
    accountSlug: String!
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
    deploymentProductionBranchGlob: String
    private: Boolean
    name: String
    summaryCheck: SummaryCheck
    defaultUserLevel: ProjectUserLevel
    ignoreConfig: IgnoreConfigInput
    deploymentEnabled: Boolean
    deploymentAuth: DeploymentAuth
    githubActionsOidcEnabled: Boolean
    tokenlessAuthEnabled: Boolean
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

  input UpdateProjectDomainInput {
    projectId: ID!
    domain: String!
  }

  input RemoveContributorFromProjectInput {
    projectId: ID!
    userAccountId: ID!
  }

  type RemoveContributorFromProjectPayload {
    projectContributorId: ID!
  }

  extend type Mutation {
    "Create a project without connecting a Git provider"
    createProject(input: CreateProjectInput!): Project!
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
    "Update the production deployment domain"
    updateProjectDomain(input: UpdateProjectDomainInput!): Project!
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
  source: "GitHub" | "GitLab" | null;
}) {
  await notifyDiscord({
    content: `
New project from ${input.account.name} (${input.email ?? "unknown email"}) ${
      input.source
        ? `imported from ${input.source}`
        : "created without a Git provider"
    }:
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

function toGraphQLDeploymentAuth(
  deploymentAuth: Project["deploymentAuth"],
): IDeploymentAuth {
  switch (deploymentAuth) {
    case "public":
      return IDeploymentAuth.Public;
    case "domain-private":
      return IDeploymentAuth.DomainPrivate;
    case "private":
      return IDeploymentAuth.Private;
    default:
      assertNever(deploymentAuth);
  }
}

function fromGraphQLDeploymentAuth(
  deploymentAuth: IDeploymentAuth,
): Project["deploymentAuth"] {
  switch (deploymentAuth) {
    case IDeploymentAuth.Public:
      return "public";
    case IDeploymentAuth.DomainPrivate:
      return "domain-private";
    case IDeploymentAuth.Private:
      return "private";
    default:
      assertNever(deploymentAuth);
  }
}

export const resolvers: IResolvers = {
  Project: {
    buildsCount: async (project, _args, ctx) => {
      return ctx.loaders.ProjectBuildsCountByProjectId.load(project.id);
    },
    ignoreConfig: (project) => {
      return project.$getIgnoreConfig();
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
    latestProductionDeployment: async (project, _args, ctx) => {
      if (!project.deploymentEnabled) {
        return null;
      }
      return ctx.loaders.LatestProductionDeploymentByProject.load(project.id);
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
                qb.whereNotExists(Build.acceptedReviewQuery());
              }

              if (!status.includes(IBuildStatus.Rejected)) {
                qb.whereNotExists(Build.rejectedReviewQuery());
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
      const result = await queryActiveTests({
        projectIds: [project.id],
        period,
        filters: filters ?? null,
        after,
        first,
      });
      return paginateResult({ result, first, after });
    },
    deployments: async (project, { first, after }) => {
      const result = await Deployment.query()
        .where("projectId", project.id)
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "id", order: "desc" },
        ])
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    domain: async (project, _args, ctx) => {
      if (!project.deploymentEnabled) {
        return null;
      }
      const domain =
        await ctx.loaders.ProductionInternalProjectDomainByProject.load(
          project.id,
        );
      return domain?.domain ?? null;
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
    deploymentProductionBranchGlob: async (project) => {
      return project.$getDeploymentProductionBranchGlob();
    },
    customDeploymentProductionBranchGlob: (project) => {
      return project.deploymentProdBranchGlob;
    },
    deploymentAuth: (project) => {
      return toGraphQLDeploymentAuth(project.deploymentAuth);
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
      if (!isValidPgBigInt(args.id)) {
        return null;
      }

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
    createProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const account = await Account.query()
        .findOne({ slug: args.input.accountSlug })
        .throwIfNotFound();

      const permissions = await account.$getPermissions(ctx.auth.user);
      if (!permissions.includes("admin")) {
        throw forbidden();
      }

      const name = args.input.name.trim();
      await checkGqlProjectName({ name, accountId: account.id });

      const project = await Project.query().insertAndFetch({
        name,
        accountId: account.id,
      });

      await notifyProjectCreation({
        project,
        email: ctx.auth.user.email,
        account,
        source: null,
      });

      return project;
    },
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

      if (args.input.deploymentProductionBranchGlob !== undefined) {
        data.deploymentProdBranchGlob =
          args.input.deploymentProductionBranchGlob ?? null;
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

      if (args.input.ignoreConfig !== undefined) {
        const { ignoreConfig } = args.input;
        data.ignoreConfig = ignoreConfig
          ? normalizeIgnoreConfig({
              enabled: ignoreConfig.enabled,
              autoIgnore: ignoreConfig.autoIgnore ?? null,
            })
          : null;
      }

      if (
        typeof args.input.deploymentEnabled === "boolean" &&
        project.deploymentEnabled !== args.input.deploymentEnabled
      ) {
        data.deploymentEnabled = args.input.deploymentEnabled;
      }

      if (
        typeof args.input.githubActionsOidcEnabled === "boolean" &&
        project.githubActionsOidcEnabled !== args.input.githubActionsOidcEnabled
      ) {
        data.githubActionsOidcEnabled = args.input.githubActionsOidcEnabled;
      }

      if (
        typeof args.input.tokenlessAuthEnabled === "boolean" &&
        project.tokenlessAuthEnabled !== args.input.tokenlessAuthEnabled
      ) {
        data.tokenlessAuthEnabled = args.input.tokenlessAuthEnabled;
      }

      if (args.input.deploymentAuth != null) {
        const deploymentAuth = fromGraphQLDeploymentAuth(
          args.input.deploymentAuth,
        );

        if (deploymentAuth === "private") {
          await project.$fetchGraph("account", { skipFetched: true });
          invariant(project.account, "account not fetched");
          if (project.account.type !== "team") {
            throw badUserInput("All deployments protection requires a team.", {
              field: "deploymentAuth",
            });
          }
        }

        if (project.deploymentAuth !== deploymentAuth) {
          data.deploymentAuth = deploymentAuth;
        }
      }

      if (args.input.name != null && project.name !== args.input.name) {
        await checkGqlProjectName({
          name: args.input.name,
          accountId: project.accountId,
        });
        data.name = args.input.name;
      }

      if (Object.keys(data).length === 0) {
        return project;
      }

      const updated = await project.$query().patchAndFetch(data);

      // If deployment access changed, invalidate the project deployment cache.
      if ("deploymentEnabled" in data || "deploymentAuth" in data) {
        await invalidateProjectDeploymentCache(project.id).catch(() => {
          // Non-blocking — best effort
        });
      }

      return updated;
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
    updateProjectDomain: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      let result;
      try {
        result = await upsertProductionInternalProjectDomain({
          projectId: project.id,
          domain: args.input.domain,
        });
      } catch (error: unknown) {
        if (error instanceof HTTPError) {
          if (error.code === "PROJECT_DOMAIN_INVALID") {
            throw badUserInput("Invalid domain", {
              field: "domain",
              code: error.code,
            });
          }

          if (error.code === "PROJECT_DOMAIN_INTERNAL_SLUG") {
            throw badUserInput("Domain already in use", {
              field: "domain",
              code: error.code,
            });
          }
        }

        if (isUniqueViolationError(error)) {
          throw badUserInput("Domain already in use", { field: "domain" });
        }

        throw error;
      }

      ctx.loaders.ProductionInternalProjectDomainByProject.clear(
        project.id,
      ).prime(project.id, result.projectDomain);

      await Promise.all(
        [result.previousAlias, result.nextAlias]
          .filter((alias): alias is string => Boolean(alias))
          .map((alias) =>
            invalidateDeploymentCache(alias).catch(() => {
              // Non-blocking — best effort
            }),
          ),
      );

      return project;
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
