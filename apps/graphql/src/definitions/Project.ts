import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Account,
  Build,
  GithubAccount,
  GithubRepository,
  Project,
  Screenshot,
  ScreenshotDiff,
  Test,
} from "@argos-ci/database/models";
import { getTokenOctokit } from "@argos-ci/github";

import type { Context } from "../context.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubRepository implements Node {
    id: ID!
    defaultBranch: String!
    private: Boolean!
  }

  type Project implements Node {
    id: ID!
    name: String!
    token: ID!
    "Builds associated to the repository"
    builds(first: Int!, after: Int!): BuildConnection!
    "A single build linked to the repository"
    build(number: Int!): Build
    "Project has Tests"
    hasTests: Boolean!
    "Tests associated to the repository"
    tests(first: Int!, after: Int!): TestConnection!
    "Determine if the current user has write access to the project"
    permissions: [Permission!]!
    "Owner of the repository"
    account: Account!
    "Repositories associated to the project"
    ghRepository: GithubRepository
    "Override branch name"
    baselineBranch: String
    "Reference branch"
    referenceBranch: String
    "Check if the project is public or not"
    public: Boolean!
    "Override repository's Github privacy"
    private: Boolean
    "Current month used screenshots"
    currentMonthUsedScreenshots: Int!
  }

  extend type Query {
    "Get a project"
    project(accountSlug: String!, projectName: String!): Project
  }

  type ProjectConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Project!]!
  }

  input CreateProjectInput {
    repo: String!
    owner: String!
    accountSlug: String!
  }

  input UpdateProjectInput {
    id: ID!
    baselineBranch: String
    private: Boolean
  }

  extend type Mutation {
    "Create a project"
    createProject(input: CreateProjectInput!): Project!
    "Update project"
    updateProject(input: UpdateProjectInput): Project!
  }
`;

export const resolvers = {
  Project: {
    token: async (
      project: Project,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.auth) return null;
      const hasWritePermission = await project.$checkWritePermission(
        ctx.auth.user
      );
      if (!hasWritePermission) return null;
      return project.token;
    },
    builds: async (
      project: Project,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await Build.query()
        .where({ projectId: project.id })
        .orderBy("createdAt", "desc")
        .orderBy("number", "desc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    build: async (project: Project, args: { number: number }) => {
      return Build.query().findOne({
        projectId: project.id,
        number: args.number,
      });
    },
    hasTests: async (project: Project) => {
      const result = await Test.query()
        .where({ projectId: project.id })
        .first();
      return !!result;
    },
    tests: async (
      project: Project,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await Test.query()
        .withGraphFetched("screenshotDiffs(orderByMaxId)")
        .modifiers({
          orderByMaxId(builder) {
            builder
              .select("testId", "stabilityScore")
              .max("id")
              .orderBy("id", "desc")
              .groupBy("testId", "id", "stabilityScore");
          },
        })
        .where({ projectId: project.id })
        .whereNot((builder) =>
          builder.whereRaw(`"name" ~ :regexp`, {
            regexp: ScreenshotDiff.screenshotFailureRegexp,
          })
        )
        .orderBy("name", "asc")
        .orderBy("id", "asc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    permissions: async (
      project: Project,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.auth) return ["read"];
      const hasWritePermission = await project.$checkWritePermission(
        ctx.auth.user
      );
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    account: async (
      project: Project,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      return ctx.loaders.Account.load(project.accountId);
    },
    ghRepository: async (
      project: Project,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!project.githubRepositoryId) return null;
      return ctx.loaders.GithubRepository.load(project.githubRepositoryId);
    },
    referenceBranch: async (project: Project) => {
      return project.$getReferenceBranch();
    },
    public: async (project: Project) => {
      return project.$checkIsPublic();
    },
    currentMonthUsedScreenshots: async (
      project: Project,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      const account = await ctx.loaders.Account.load(project.accountId);
      const currentConsumptionStartDate =
        await account.getCurrentConsumptionStartDate();
      return Screenshot.query()
        .joinRelated("screenshotBucket")
        .where("screenshotBucket.projectId", project.id)
        .where("screenshots.createdAt", ">=", currentConsumptionStartDate)
        .resultSize();
    },
  },
  Query: {
    project: async (
      _root: null,
      args: { accountSlug: string; projectName: string },
      ctx: Context
    ) => {
      const project = await Project.query().joinRelated("account").findOne({
        "account.slug": args.accountSlug,
        "projects.name": args.projectName,
      });

      if (!project) return null;

      const hasReadPermission = await project.$checkReadPermission(
        ctx.auth?.user ?? null
      );
      if (!hasReadPermission) return null;

      return project;
    },
  },
  Mutation: {
    createProject: async (
      _root: null,
      args: {
        input: {
          repo: string;
          owner: string;
          accountSlug: string;
        };
      },
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Unauthorized");
      }
      const account = await Account.query().findOne({
        slug: args.input.accountSlug,
      });
      if (!account) {
        throw new Error("Account not found");
      }
      const hasWritePermission = await account.$checkWritePermission(
        ctx.auth.user
      );
      if (!hasWritePermission) {
        throw new Error("Unauthorized");
      }
      const octokit = getTokenOctokit(ctx.auth.user.accessToken);
      const ghApiRepo = await octokit.repos
        .get({
          owner: args.input.owner,
          repo: args.input.repo,
        })
        .then((res) => res.data);
      if (!ghApiRepo) {
        throw new Error("Repository not found");
      }

      const getOrCreateAccount = async () => {
        const account = await GithubAccount.query().findOne({
          githubId: ghApiRepo.owner.id,
        });
        if (account) {
          return account;
        }
        return GithubAccount.query().insertAndFetch({
          githubId: ghApiRepo.owner.id,
          login: ghApiRepo.owner.login,
          type: ghApiRepo.owner.type as "user" | "organization",
          name: ghApiRepo.owner.name ?? null,
        });
      };

      const getOrCreateRepo = async (props: { githubAccountId: string }) => {
        const repo = await GithubRepository.query().findOne({
          githubId: ghApiRepo.id,
        });
        if (repo) {
          return repo;
        }
        return GithubRepository.query().insertAndFetch({
          githubId: ghApiRepo.id,
          name: ghApiRepo.name,
          private: ghApiRepo.private,
          defaultBranch: ghApiRepo.default_branch,
          githubAccountId: props.githubAccountId,
        });
      };

      const getOrCreateProject = async (props: {
        accountId: string;
        githubRepositoryId: string;
      }) => {
        const project = await Project.query().findOne({
          githubRepositoryId: props.githubRepositoryId,
        });
        if (project) {
          return project;
        }
        return Project.query().insertAndFetch({
          name: ghApiRepo.name,
          accountId: props.accountId,
          githubRepositoryId: props.githubRepositoryId,
        });
      };

      const ghAccount = await getOrCreateAccount();
      const ghRepo = await getOrCreateRepo({ githubAccountId: ghAccount.id });
      return getOrCreateProject({
        accountId: account.id,
        githubRepositoryId: ghRepo.id,
      });
    },
    updateProject: async (
      _root: null,
      args: {
        input: {
          id: string;
          baselineBranch?: string | null;
          private?: boolean | null;
        };
      },
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Unauthorized");
      }

      const { id } = args.input;
      const project = await Project.query().findById(id);

      if (!project) {
        throw new Error("Project not found");
      }

      const hasWritePermission = await project.$checkWritePermission(
        ctx.auth.user
      );

      if (!hasWritePermission) {
        throw new Error("Unauthorized");
      }

      const data: PartialModelObject<Project> = {};

      if (args.input.baselineBranch !== undefined) {
        data.baselineBranch = args.input.baselineBranch?.trim() ?? null;
      }

      if (args.input.private !== undefined) {
        data.private = args.input.private;
      }

      return project.$query().patchAndFetch(data);
    },
  },
};
