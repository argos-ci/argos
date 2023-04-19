import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Build,
  Project,
  Screenshot,
  ScreenshotDiff,
  Test,
} from "@argos-ci/database/models";

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
    slug: String!
    token: ID!
    "Builds associated to the repository"
    builds(first: Int!, after: Int!): BuildConnection!
    "A single build linked to the repository"
    build(number: Int!): Build
    "Tests associated to the repository"
    tests(first: Int!, after: Int!): TestConnection!
    "Determine if the current user has write access to the project"
    permissions: [Permission!]!
    "Owner of the repository"
    account: Account!
    "Repositories associated to the project"
    ghRepository: GithubRepository!
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
    project(accountSlug: String!, projectSlug: String!): Project
  }

  type ProjectConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Project!]!
  }

  input UpdateProjectInput {
    id: ID!
    baselineBranch: String
    private: Boolean
  }

  extend type Mutation {
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
    tests: async (
      project: Project,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await Test.query()
        .where({ projectId: project.id })
        .whereNot((builder) =>
          builder.whereRaw(`"name" ~ :regexp`, {
            regexp: ScreenshotDiff.screenshotFailureRegexp,
          })
        )
        .leftJoin(
          "screenshot_diffs AS last_diff",
          "last_diff.testId",
          "=",
          "tests.id"
        )
        .leftJoin("screenshot_diffs AS other_diff", function () {
          this.on("other_diff.testId", "=", "tests.id").andOn(
            "other_diff.createdAt",
            ">",
            "last_diff.createdAt"
          );
        })
        .whereNull("other_diff.id")
        .orderBy("last_diff.stabilityScore", "asc")
        .orderBy("tests.name", "asc")
        .orderBy("tests.id", "asc")
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
      args: { accountSlug: string; projectSlug: string },
      ctx: Context
    ) => {
      const project = await Project.query().joinRelated("account").findOne({
        "account.slug": args.accountSlug,
        "projects.slug": args.projectSlug,
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

      if (args.input.private != null) {
        data.private = args.input.private;
      }

      return project.$query().patchAndFetch(data);
    },
  },
};
