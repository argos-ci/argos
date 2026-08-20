import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import type { BuildType } from "@argos/schemas/build-type";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { isUniqueViolationError } from "@/database/error";
import {
  Account,
  AutomationRule,
  Build,
  Deployment,
  GithubInstallation,
  GitlabProject,
  OriginRepository,
  Project,
  Screenshot,
  User,
} from "@/database/models";
import { queryBuilds } from "@/database/services/build";
import { queryIgnoredChanges } from "@/database/services/ignored-change";
import {
  createProject as createProjectService,
  loadProjectById,
  notifyProjectCreation,
  resolveProjectName,
  transferProject as transferProjectService,
  updateProject as updateProjectService,
} from "@/database/services/project";
import {
  addOrUpdateProjectContributor,
  queryProjectContributors,
  removeProjectContributor,
} from "@/database/services/project-contributor";
import { upsertProductionInternalProjectDomain } from "@/database/services/project-domain";
import { loadAccountById } from "@/database/services/team-member";
import { queryActiveTests } from "@/database/services/test";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { invalidateDeploymentCache } from "@/deployment/invalidate";
import { getInstallationOctokit } from "@/github/client";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab";
import { getOrCreateGithubRepository } from "@/graphql/services/github";
import { HTTPError } from "@/util/error";
import { safeParseTestId } from "@/util/test-id";

import {
  IBuildStatus,
  IDeploymentAuth,
  IProjectPermission,
  IProjectUserLevel,
  IResolvers,
} from "../__generated__/resolver-types";
import { deleteProject, getAdminProject } from "../services/project";
import { primeActiveTestMetrics } from "../services/test";
import {
  badUserInput,
  forbidden,
  toGraphQLError,
  unauthenticated,
} from "../util";
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
    "Search in build name, branch and commit"
    search: String
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
    "Changes currently ignored in this project, most recently ignored first"
    ignoredChanges(after: Int = 0, first: Int = 30): TestChangesConnection!
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

  input ImportOriginProjectInput {
    originRepositoryId: ID!
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

  input LinkOriginRepositoryInput {
    projectId: ID!
    originRepositoryId: ID!
  }

  input UnlinkOriginRepositoryInput {
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
    "Import a Cursor Origin repository as a new project"
    importOriginProject(input: ImportOriginProjectInput!): Project!
    "Link a Cursor Origin repository to a project"
    linkOriginRepository(input: LinkOriginRepositoryInput!): Project!
    "Unlink the Cursor Origin repository of a project"
    unlinkOriginRepository(input: UnlinkOriginRepositoryInput!): Project!
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
  const client = await getGitlabClientFromAccount(props.account, {
    mode: "manual",
  });
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

/**
 * Resolve an Origin repository the account's installation reaches. The account
 * only sees repositories through its installation, so a repository outside of
 * it is not the account's to link.
 */
async function getAccountOriginRepository(props: {
  account: Account;
  originRepositoryId: string;
}): Promise<OriginRepository> {
  if (!props.account.originInstallationId) {
    throw badUserInput("The account has no Cursor Origin installation");
  }
  if (!isValidPgBigInt(props.originRepositoryId)) {
    throw badUserInput("Cursor Origin repository not found");
  }
  const repository = await OriginRepository.query()
    .findById(props.originRepositoryId)
    .where({ originInstallationId: props.account.originInstallationId });
  if (!repository) {
    throw badUserInput("Cursor Origin repository not found");
  }
  return repository;
}

const importOriginProject = async (props: {
  accountSlug: string;
  creator: User;
  originRepositoryId: string;
}) => {
  const account = await Account.query()
    .findOne({ slug: props.accountSlug })
    .throwIfNotFound();

  const permissions = await account.$getPermissions(props.creator);
  if (!permissions.includes("admin")) {
    throw forbidden();
  }

  const repository = await getAccountOriginRepository({
    account,
    originRepositoryId: props.originRepositoryId,
  });

  const name = await resolveProjectName({
    name: repository.name,
    accountId: account.id,
  });

  const project = await Project.query().insertAndFetch({
    name,
    accountId: account.id,
    originRepositoryId: repository.id,
  });

  await notifyProjectCreation({
    project,
    email: props.creator.email,
    account,
    source: "Cursor Origin",
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

function fromGraphQLBuildStatus(status: IBuildStatus): BuildAggregatedStatus {
  switch (status) {
    case IBuildStatus.Accepted:
      return "accepted";
    case IBuildStatus.Rejected:
      return "rejected";
    case IBuildStatus.NoChanges:
      return "no-changes";
    case IBuildStatus.ChangesDetected:
      return "changes-detected";
    case IBuildStatus.Pending:
      return "pending";
    case IBuildStatus.Progress:
      return "progress";
    case IBuildStatus.Aborted:
      return "aborted";
    case IBuildStatus.Expired:
      return "expired";
    case IBuildStatus.Error:
      return "error";
    default:
      assertNever(status);
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
      const query = queryBuilds({
        projectId: project.id,
        filters: {
          name: filters?.name,
          type: filters?.type as BuildType[] | null | undefined,
          status: filters?.status?.map(fromGraphQLBuildStatus),
          search: filters?.search,
        },
      });

      // Fetch one extra row to know if there is a next page instead of
      // running an expensive `count(*)` on every page.
      const rows = await query
        .clone()
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "number", order: "desc" },
        ])
        .offset(after)
        .limit(first + 1);

      const hasNextPage = rows.length > first;
      const edges = hasNextPage ? rows.slice(0, first) : rows;

      return {
        pageInfo: {
          hasNextPage,
          isEmpty: after === 0 && edges.length === 0,
          // Counting builds is expensive on large projects, only pay for it
          // when the field is requested (graphql-js invokes function
          // properties lazily in its default resolver).
          totalCount: (() => query.resultSize()) as unknown as number,
        },
        edges,
      };
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
    ignoredChanges: async (project, { first, after }) => {
      const result = await queryIgnoredChanges({
        projectId: project.id,
        after,
        first,
      });
      return paginateResult({
        result: {
          total: result.total,
          results: result.results.map((row) => ({ project, ...row })),
        },
        first,
        after,
      });
    },
    tests: async (project, { first, after, period, filters }, ctx) => {
      const result = await queryActiveTests({
        projectIds: [project.id],
        period,
        filters: filters ?? null,
        after,
        first,
      });
      primeActiveTestMetrics({
        loaders: ctx.loaders,
        results: result.results,
        period,
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
      if (project.originRepositoryId) {
        return ctx.loaders.OriginRepository.load(project.originRepositoryId);
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

      // Shared with the REST API.
      const result = await queryProjectContributors({
        projectId: project.id,
        currentUserId: ctx.auth.user.id,
      }).range(after, after + first - 1);

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

      try {
        return await createProjectService({
          account,
          user: ctx.auth.user,
          name: args.input.name,
          source: null,
        });
      } catch (error) {
        // Map the shared service's errors onto this API's GraphQL error
        // contract, keying on the error code rather than the HTTP status: a
        // 400 does not necessarily concern the name.
        if (
          error instanceof HTTPError &&
          error.code === "PROJECT_NAME_INVALID"
        ) {
          throw badUserInput(error.message, {
            field: "name",
            code: error.code,
          });
        }
        throw toGraphQLError(error);
      }
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
    importOriginProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return importOriginProject({
        accountSlug: args.input.accountSlug,
        originRepositoryId: args.input.originRepositoryId,
        creator: ctx.auth.user,
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
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const project = await loadProjectById(args.input.id);
        // Shared with the REST API — same admin check, same validation.
        return await updateProjectService({
          project,
          user: ctx.auth.user,
          input: {
            name: args.input.name ?? undefined,
            defaultBaseBranch: args.input.defaultBaseBranch,
            autoApprovedBranchGlob: args.input.autoApprovedBranchGlob,
            deploymentProductionBranchGlob:
              args.input.deploymentProductionBranchGlob,
            private: args.input.private,
            summaryCheck: args.input.summaryCheck ?? undefined,
            defaultUserLevel: args.input.defaultUserLevel,
            ignoreConfig:
              args.input.ignoreConfig === undefined
                ? undefined
                : args.input.ignoreConfig
                  ? {
                      enabled: args.input.ignoreConfig.enabled,
                      autoIgnore: args.input.ignoreConfig.autoIgnore ?? null,
                    }
                  : null,
            deploymentEnabled: args.input.deploymentEnabled ?? undefined,
            deploymentAuth: args.input.deploymentAuth
              ? fromGraphQLDeploymentAuth(args.input.deploymentAuth)
              : undefined,
            githubActionsOidcEnabled:
              args.input.githubActionsOidcEnabled ?? undefined,
            tokenlessAuthEnabled: args.input.tokenlessAuthEnabled ?? undefined,
          },
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
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
        originRepositoryId: null,
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
        originRepositoryId: null,
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
    linkOriginRepository: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth.user,
        withGraphFetched: "account",
      });

      invariant(project.account, "account not fetched");

      const repository = await getAccountOriginRepository({
        account: project.account,
        originRepositoryId: args.input.originRepositoryId,
      });

      return project.$query().patchAndFetch({
        originRepositoryId: repository.id,
        githubRepositoryId: null,
        gitlabProjectId: null,
      });
    },
    unlinkOriginRepository: async (_root, args, ctx) => {
      const project = await getAdminProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      return project.$query().patchAndFetch({
        originRepositoryId: null,
      });
    },
    transferProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const [project, targetAccount] = await Promise.all([
          loadProjectById(args.input.id),
          loadAccountById(args.input.targetAccountId),
        ]);
        // Shared with the REST API — same admin checks on both sides of the
        // move, same name validation.
        return await transferProjectService({
          project,
          user: ctx.auth.user,
          targetAccount,
          name: args.input.name,
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
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
      try {
        const project = await loadProjectById(args.input.projectId);
        // Shared with the REST API — same admin check, same idempotence.
        return await addOrUpdateProjectContributor({
          project,
          user: ctx.auth.user,
          userAccountId: args.input.userAccountId,
          level: args.input.level,
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
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

        throw toGraphQLError(error);
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
      try {
        const project = await loadProjectById(args.input.projectId);
        // Shared with the REST API — admins can remove anyone, anyone can
        // remove themselves.
        return await removeProjectContributor({
          project,
          user: ctx.auth.user,
          userAccountId: args.input.userAccountId,
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
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
