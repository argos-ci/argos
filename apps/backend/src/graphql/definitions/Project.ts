import { GraphQLError } from "graphql";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Account,
  Build,
  GitlabProject,
  Project,
  Screenshot,
  Test,
  User,
  VercelConfiguration,
} from "@/database/models/index.js";

import { IPermission, IResolvers } from "../__generated__/resolver-types.js";
import { deleteProject, getWritableProject } from "../services/project.js";
import { unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";
import { linkVercelProject } from "./Vercel.js";
import {
  checkProjectName,
  resolveProjectName,
} from "@/database/services/project.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { invariant } from "@/util/invariant.js";
import { notifyDiscord } from "@/discord/index.js";
import { captureException } from "@sentry/node";
import { getOrCreateGithubRepository } from "@/graphql/services/github.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum SummaryCheck {
    always
    never
    auto
  }

  type GithubRepository implements Node {
    id: ID!
    defaultBranch: String!
    private: Boolean!
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
    "Tests associated to the repository"
    tests(first: Int!, after: Int!): TestConnection!
      @deprecated(reason: "Remove in future release")
    "Determine if the current user has write access to the project"
    permissions: [Permission!]!
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
    "Vercel project"
    vercelProject: VercelProject
    "Project slug"
    slug: String!
    "Pull request comment enabled"
    prCommentEnabled: Boolean!
    "Summary check"
    summaryCheck: SummaryCheck!
    "Build names"
    buildNames: [String!]!
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

  input UnlinkVercelProjectInput {
    projectId: ID!
  }

  input LinkVercelProjectInput {
    projectId: ID!
    configurationId: ID!
    vercelProjectId: ID!
  }

  input UpdateProjectPrCommentInput {
    id: ID!
    enable: Boolean!
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
    "Link Vercel project"
    linkVercelProject(input: LinkVercelProjectInput!): Project!
    "Unlink Vercel project"
    unlinkVercelProject(input: UnlinkVercelProjectInput!): Project!
    "Transfer Project to another account"
    transferProject(input: TransferProjectInput!): Project!
    "Delete Project"
    deleteProject(id: ID!): Boolean!
    "Set project pull request comment"
    updateProjectPrComment(input: UpdateProjectPrCommentInput!): Project!
  }
`;

const checkGqlProjectName = async (
  args: Parameters<typeof checkProjectName>[0],
) => {
  try {
    await checkProjectName(args);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: "BAD_USER_INPUT",
          field: "name",
        },
      });
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

const importGithubProject = async (props: {
  accountSlug: string;
  creator: User;
  repo: string;
  owner: string;
}) => {
  const account = await Account.query()
    .findOne({ slug: props.accountSlug })
    .throwIfNotFound();
  const hasWritePermission = await account.$checkWritePermission(props.creator);
  if (!hasWritePermission) {
    throw new Error("Unauthorized");
  }

  const ghRepo = await getOrCreateGithubRepository({
    accessToken: props.creator.accessToken,
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
};

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
  if (!glProject) {
    throw new Error("GitLab Project not found");
  }

  if (!("default_branch" in glProject)) {
    throw new GraphQLError(
      `GitLab user behinds the specified access token should have a "developer" role at minimum.`,
      {
        extensions: {
          code: "BAD_USER_INPUT",
        },
      },
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
  const hasWritePermission = await account.$checkWritePermission(props.creator);
  if (!hasWritePermission) {
    throw new Error("Unauthorized");
  }

  if (!account.gitlabAccessToken) {
    throw new Error("Gitlab access token is missing");
  }

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
      if (!ctx.auth) return null;
      const hasWritePermission = await project.$checkWritePermission(
        ctx.auth.user,
      );
      if (!hasWritePermission) return null;
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
    tests: async (project, { first, after }) => {
      // @TODO remove in future release
      const result = await Test.query()
        .where("projectId", project.id)
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    permissions: async (project, _args, ctx) => {
      if (!ctx.auth) return [IPermission.Read];
      const hasWritePermission = await project.$checkWritePermission(
        ctx.auth.user,
      );
      return hasWritePermission
        ? [IPermission.Read, IPermission.Write]
        : [IPermission.Read];
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
    vercelProject: async (project, _args, ctx) => {
      if (!project.vercelProjectId) return null;
      const vercelProject = await ctx.loaders.VercelProject.load(
        project.vercelProjectId,
      );
      invariant(vercelProject, "Vercel project not found");
      const activeConfiguration = await vercelProject
        .$relatedQuery("activeConfiguration")
        .first();
      if (!activeConfiguration) return null;
      return vercelProject;
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
  },
  Query: {
    project: async (_root, args, ctx) => {
      const project = await Project.query().joinRelated("account").findOne({
        "account.slug": args.accountSlug,
        "projects.name": args.projectName,
      });

      if (!project) return null;

      const hasReadPermission = await project.$checkReadPermission(
        ctx.auth?.user ?? null,
      );
      if (!hasReadPermission) return null;

      return project;
    },
    projectById: async (_root, args, ctx) => {
      const project = await Project.query()
        .joinRelated("account")
        .findById(args.id);

      if (!project) return null;

      const hasReadPermission = await project.$checkReadPermission(
        ctx.auth?.user ?? null,
      );
      if (!hasReadPermission) return null;

      return project;
    },
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
      const project = await getWritableProject({
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

      const project = await getWritableProject({
        id: args.input.projectId,
        user: ctx.auth.user,
      });

      const ghRepo = await getOrCreateGithubRepository({
        accessToken: ctx.auth.user.accessToken,
        owner: args.input.owner,
        repo: args.input.repo,
      });

      return project.$query().patchAndFetch({
        githubRepositoryId: ghRepo.id,
        gitlabProjectId: null,
      });
    },
    unlinkGithubRepository: async (_root, args, ctx) => {
      const project = await getWritableProject({
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

      const project = await getWritableProject({
        id: args.input.projectId,
        user: ctx.auth.user,
      });

      const account = await project.$relatedQuery("account");

      if (!account.gitlabAccessToken) {
        throw new Error("Gitlab access token is missing");
      }

      const gitlabProject = await getOrCreateGitlabProject({
        account,
        gitlabProjectId: args.input.gitlabProjectId,
      });

      return project.$query().patchAndFetch({
        gitlabProjectId: gitlabProject.id,
        githubRepositoryId: null,
      });
    },
    unlinkGitlabProject: async (_root, args, ctx) => {
      const project = await getWritableProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      return project.$query().patchAndFetch({
        gitlabProjectId: null,
      });
    },
    linkVercelProject: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const vercelConfiguration = await VercelConfiguration.query()
        .findById(args.input.configurationId)
        .throwIfNotFound();

      if (!vercelConfiguration.vercelAccessToken) {
        throw new Error("Invariant: Vercel access token is missing");
      }

      await linkVercelProject({
        vercelProjectId: args.input.vercelProjectId,
        projectId: args.input.projectId,
        creator: ctx.auth.user,
        vercelConfiguration,
        vercelAccessToken: vercelConfiguration.vercelAccessToken,
      });

      return Project.query().findById(args.input.projectId).throwIfNotFound();
    },
    unlinkVercelProject: async (_root, args, ctx) => {
      const project = await getWritableProject({
        id: args.input.projectId,
        user: ctx.auth?.user,
      });

      return project.$query().patchAndFetch({
        vercelProjectId: null,
      });
    },
    transferProject: async (_root, args, ctx) => {
      const project = await getWritableProject({
        id: args.input.id,
        user: ctx.auth?.user,
      });
      const { targetAccountId } = args.input;
      if (project.accountId === targetAccountId) {
        throw new Error("Project is already owned by this account");
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
      const project = await getWritableProject({
        id: args.input.id,
        user: ctx.auth?.user,
      });

      return project
        .$query()
        .patchAndFetch({ prCommentEnabled: args.input.enable });
    },
  },
};
