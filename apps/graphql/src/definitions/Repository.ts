import gqlTag from "graphql-tag";
import type { TransactionOrKnex } from "objection";

import { transaction } from "@argos-ci/database";
import {
  Account,
  Build,
  Repository,
  Screenshot,
  ScreenshotDiff,
  Test,
} from "@argos-ci/database/models";
import type { User } from "@argos-ci/database/models";

import type { Context } from "../context.js";
import { APIError } from "../util.js";
import { getOwner } from "./Owner.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Repository implements Node {
    id: ID!
    name: String!
    enabled: Boolean!
    token: ID
    "Builds associated to the repository"
    builds(first: Int!, after: Int!): BuildConnection!
    "A single build linked to the repository"
    build(number: Int!): Build
    "Tests associated to the repository"
    tests(first: Int!, after: Int!): TestConnection!
    "Determine if the current user has write access to the repository"
    permissions: [Permission!]!
    "Owner of the repository"
    owner: Owner!
    "Github default branch"
    defaultBranch: String
    "Override branch name"
    baselineBranch: String
    "Reference branch"
    referenceBranch: String
    "Private repository on GitHub"
    private: Boolean!
    "Override repository's Github privacy"
    forcedPrivate: Boolean!
    "Current month used screenshots"
    currentMonthUsedScreenshots: Int!
    "Repository's users"
    users(first: Int!, after: Int!): UserConnection!
  }

  extend type Query {
    "Get a repository"
    repository(ownerLogin: String!, repositoryName: String!): Repository
  }

  extend type Mutation {
    "Update repository baseline branch"
    updateReferenceBranch(
      repositoryId: String!
      baselineBranch: String
    ): Repository!
    "Update repository forced private"
    updateForcedPrivate(
      repositoryId: String!
      forcedPrivate: Boolean!
    ): Repository!
  }
`;

export async function getRepository({
  ownerLogin,
  name,
  user,
}: {
  ownerLogin: string;
  name: string;
  user: User | null;
}) {
  const owner = await getOwner({ login: ownerLogin });
  if (!owner) return null;

  const repository = await Repository.query().findOne({
    [`${owner.type()}Id`]: owner.id,
    name,
  });

  if (!repository) return null;

  const hasReadPermission = await repository.$checkReadPermission(user);
  if (!hasReadPermission) return null;

  return repository;
}

async function checkUserRepositoryAccess({
  user,
  repositoryId,
  trx,
}: {
  user: User | null;
  repositoryId: string;
  trx?: TransactionOrKnex;
}) {
  if (!user) throw new APIError("Invalid user identification");

  const repositoryUser = await Repository.getUsers(repositoryId, {
    trx,
  }).findById(user.id);

  if (!repositoryUser) throw new APIError("Invalid user authorization");
}

export const resolvers = {
  Repository: {
    enabled: async (repository: Repository) => {
      const buildCount = await repository.$relatedQuery("builds").resultSize();
      return buildCount > 0;
    },
    token: async (
      repository: Repository,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.user) return null;
      const hasWritePermission = await repository.$checkWritePermission(
        ctx.user
      );
      if (!hasWritePermission) return null;
      return repository.token;
    },
    owner: async (
      repository: Repository,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (repository.userId) {
        return ctx.loaders.User.load(repository.userId);
      }
      if (repository.organizationId) {
        return ctx.loaders.Organization.load(repository.organizationId);
      }
      throw new Error(`Invalid repository owner: ${repository.id}`);
    },
    users: async (
      repository: Repository,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await repository
        .$relatedQuery("users")
        .orderBy("login", "asc")
        .range(after, after + first - 1);
      return paginateResult({ result, first, after });
    },
    permissions: async (
      repository: Repository,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.user) return ["read"];
      const hasWritePermission = await repository.$checkWritePermission(
        ctx.user
      );
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    builds: async (
      repository: Repository,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await Build.query()
        .where({ repositoryId: repository.id })
        .whereNot({ number: 0 })
        .orderBy("createdAt", "desc")
        .orderBy("number", "desc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    build: async (repository: Repository, args: { number: number }) => {
      return Build.query().findOne({
        repositoryId: repository.id,
        number: args.number,
      });
    },
    tests: async (
      repository: Repository,
      { first, after }: { first: number; after: number }
    ) => {
      const result = await Test.query()
        .where({ repositoryId: repository.id })
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
    currentMonthUsedScreenshots: async (repository: Repository) => {
      const account = await Account.getAccount(repository);
      const currentConsumptionStartDate =
        await account.getCurrentConsumptionStartDate();
      return Screenshot.query()
        .joinRelated("screenshotBucket")
        .where("screenshotBucket.repositoryId", repository.id)
        .where("screenshots.createdAt", ">=", currentConsumptionStartDate)
        .resultSize();
    },
  },
  Query: {
    repository: async (
      _root: null,
      args: { ownerLogin: string; repositoryName: string },
      ctx: Context
    ) => {
      return getRepository({
        ownerLogin: args.ownerLogin,
        name: args.repositoryName,
        user: ctx.user,
      });
    },
  },
  Mutation: {
    updateReferenceBranch: async (
      _root: null,
      args: { repositoryId: string; baselineBranch?: string },
      ctx: Context
    ) => {
      return transaction(async (trx) => {
        await checkUserRepositoryAccess({
          user: ctx.user,
          repositoryId: args.repositoryId,
          trx,
        });
        return Repository.query(trx).patchAndFetchById(args.repositoryId, {
          baselineBranch: args.baselineBranch?.trim() ?? null,
        });
      });
    },
    updateForcedPrivate: async (
      _root: null,
      args: { repositoryId: string; forcedPrivate: boolean },
      ctx: Context
    ) => {
      await checkUserRepositoryAccess({
        user: ctx.user,
        repositoryId: args.repositoryId,
      });
      return Repository.query().patchAndFetchById(args.repositoryId, {
        forcedPrivate: args.forcedPrivate,
      });
    },
  },
};
