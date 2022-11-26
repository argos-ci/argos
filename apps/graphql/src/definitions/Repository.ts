import gqlTag from "graphql-tag";
import type { TransactionOrKnex } from "objection";

import { transaction } from "@argos-ci/database";
import {
  Account,
  Build,
  Repository,
  Screenshot,
} from "@argos-ci/database/models";
import type { User } from "@argos-ci/database/models";

import type { Context } from "../context.js";
import { APIError } from "../util.js";
import { getOwner } from "./Owner.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Repository {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    githubId: ID!
    name: String!
    enabled: Boolean!
    token: ID
    organizationId: ID!
    "Builds associated to the repository"
    builds(first: Int!, after: Int!): BuildResult!
    "A single build linked to the repository"
    build(number: Int!): Build
    "Determine if the current user has write access to the repository"
    permissions: [Permission!]!
    "Owner of the repository"
    owner: Owner!
    sampleBuildId: ID
    "Github default branch"
    defaultBranch: String
    "Override branch name"
    baselineBranch: String
    "Reference branch"
    referenceBranch: String
    "Private repository on GitHub"
    private: Boolean!
    "Current month used screenshots"
    currentMonthUsedScreenshots: Int!
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
  trx: TransactionOrKnex;
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
      args: { first: number; after: number }
    ) => {
      const result = await Build.query()
        .where({ repositoryId: repository.id })
        .whereNot({ number: 0 })
        .orderBy("createdAt", "desc")
        .orderBy("number", "desc")
        .range(args.after, args.after + args.first - 1);

      const hasNextPage = args.after + args.first < result.total;

      return {
        pageInfo: {
          totalCount: result.total,
          hasNextPage,
          endCursor: hasNextPage ? args.after + args.first : result.total,
        },
        edges: result.results,
      };
    },
    build: async (repository: Repository, args: { number: number }) => {
      return Build.query().findOne({
        repositoryId: repository.id,
        number: args.number,
      });
    },
    // @TODO remove from client and remove this resolver
    sampleBuildId: () => {
      return null;
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
  },
};
