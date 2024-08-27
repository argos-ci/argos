import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { captureException } from "@sentry/node";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Account,
  Build,
  GitlabProject,
  Project,
  ProjectUser,
  Screenshot,
  User,
} from "@/database/models/index.js";
import {
  checkProjectName,
  resolveProjectName,
} from "@/database/services/project.js";
import { notifyDiscord } from "@/discord/index.js";
import { getInstallationOctokit, getTokenOctokit } from "@/github/client.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { getOrCreateGithubRepository } from "@/graphql/services/github.js";

import {
  IProjectPermission,
  IProjectUserLevel,
  IResolvers,
} from "../__generated__/resolver-types.js";
import { deleteProject, getAdminProject } from "../services/project.js";
import { badUserInput, forbidden, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

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

  type Project implements Node {
    id: ID!
    name: String!
    token: String
    "Builds associated to the repository"
    builds(first: Int = 30, after: Int = 0, buildName: String): BuildConnection!
    "A single build linked to the repository"
    build(number: Int!): Build
    "Reference build"
    latestReferenceBuild: Build
    "Latest build"
    latestBuild: Build
    "Determine permissions of the current user"
    permissions: [ProjectPermission!]!
    "Owner of the repository"
    account: Account!
    "Repository associated to the project"
    repository: Repository
    "Override branch name"
    baselineBranch: String
    "Reference branch"
    referenceBranch: String!
    "Check if the project is public or not"
    public: Boolean!
    "Override repository's Github privacy"
    private: Boolean
    "Current month used screenshots"
    currentPeriodScreenshots: Int!
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
  }

  extend type Query {
    "Get a project"
    project(
      accountSlug: String!
      projectName: String!
      buildName: String
    ): Project
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
    app: GitHubAppType!
  }

  input ImportGitlabProjectInput {
    gitlabProjectId: ID!
    accountSlug: String!
  }

  input UpdateProjectInput {
    id: ID!
    baselineBranch: String
    private: Boolean
    name: String
    summaryCheck: SummaryCheck
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
    app: GitHubAppType!
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
    captureException(error);
  });
}

async function getGitHubOctokitFromAppType(input: {
  account: Account;
  creator: User;
  app: "main" | "light";
}) {
  switch (input.app) {
    case "main":
      return getTokenOctokit(input.creator.accessToken);
    case "light":
      invariant(
        input.account.githubLightInstallationId,
        "GitHub Light installation not found",
      );
      return getInstallationOctokit(input.account.githubLightInstallationId);
    default:
      assertNever(input.app);
  }
}

async function importGithubProject(props: {
  accountSlug: string;
  creator: User;
  repo: string;
  owner: string;
  app: "main" | "light";
}) {
  const account = await Account.query()
    .findOne({ slug: props.accountSlug })
    .throwIfNotFound();

  const permissions = await account.$getPermissions(props.creator);

  if (!permissions.includes("admin")) {
    throw forbidden();
  }

  const octokit = await getGitHubOctokitFromAppType({
    account,
    creator: props.creator,
    app: props.app,
  });

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
    latestReferenceBuild: async (project) => {
      const latestReferenceBuild = await Build.query()
        .where("projectId", project.id)
        .where("type", "reference")
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "number", order: "desc" },
        ])
        .first();
      return latestReferenceBuild ?? null;
    },
    latestBuild: async (project, _args, ctx) => {
      return ctx.loaders.LatestProjectBuild.load(project.id);
    },
    builds: async (project, { first, after, buildName }) => {
      const result = await Build.query()
        .where({ projectId: project.id })
        .where((query) =>
          buildName ? query.where({ name: buildName }) : query,
        )
        .orderBy([
          { column: "createdAt", order: "desc" },
          { column: "number", order: "desc" },
        ])
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    build: async (project, args) => {
      const build = await Build.query().findOne({
        projectId: project.id,
        number: args.number,
      });
      return build ?? null;
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
    referenceBranch: async (project) => {
      return project.$getReferenceBranch();
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
      const startDate = await manager.getCurrentPeriodStartDate();
      return account.$getScreenshotCountFromDate(startDate.toISOString(), {
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
        .where("projectId", project.id)
        .select("name")
        .distinct("name");
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

      const permssions = await project.$getPermissions(ctx.auth?.user ?? null);

      if (!permssions.includes("view")) {
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

      const permssions = await project.$getPermissions(ctx.auth?.user ?? null);

      if (!permssions.includes("view")) {
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
        app: args.input.app,
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

      if (args.input.baselineBranch !== undefined) {
        data.baselineBranch = args.input.baselineBranch ?? null;
      }

      if (args.input.private !== undefined) {
        data.private = args.input.private;
      }

      if (args.input.summaryCheck != null) {
        data.summaryCheck = args.input.summaryCheck;
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

      const octokit = await getGitHubOctokitFromAppType({
        account: project.account,
        creator: ctx.auth.user,
        app: args.input.app,
      });

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
  },
};
