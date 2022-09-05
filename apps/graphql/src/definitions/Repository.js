import crypto from "crypto";
import { promisify } from "util";
import { gql } from "graphql-tag";
import { transaction } from "@argos-ci/database";
import { Build, Repository } from "@argos-ci/database/models";
import { APIError } from "../util";
import { getOwner } from "./Owner";

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
    permissions: [Permission]!
    "Owner of the repository"
    owner: Owner
    sampleBuildId: ID
    "Github default branch"
    defaultBranch: String
    "Use default branch"
    useDefaultBranch: Boolean!
    "Override branch name"
    baselineBranch: String
  }

  extend type Query {
    "Get a repository"
    repository(ownerLogin: String!, repositoryName: String!): Repository
  }

  extend type Mutation {
    "Enable or disable a repository."
    toggleRepository(enabled: Boolean!, repositoryId: String!): Repository!
    "Update repository baseline branch"
    updateReferenceBranch(
      repositoryId: String!
      baselineBranch: String
      useDefaultBranch: Boolean!
    ): Repository!
  }
`;

const generateRandomBytes = promisify(crypto.randomBytes);

export async function getRepository({ ownerLogin, name, user }) {
  const owner = await getOwner({ login: ownerLogin });
  if (!owner) return null;

  const repository = await Repository.query()
    .where({
      [`${owner.type()}Id`]: owner.id,
      name,
    })
    .limit(1)
    .first();

  if (!repository) return null;

  const hasReadPermission = await repository.$checkReadPermission(user);
  if (!hasReadPermission) return null;

  return repository;
}

async function checkUserRepositoryAccess({ user, repositoryId }, { trx }) {
  if (!user) throw new APIError("Invalid user identification");

  const repositoryUser = await Repository.getUsers(repositoryId, {
    trx,
  }).findById(user.id);

  if (!repositoryUser) throw new APIError("Invalid user authorization");
}

export const resolvers = {
  Repository: {
    async token(repository, args, context) {
      const hasWritePermission = await repository.$checkWritePermission(
        context.user
      );
      if (!hasWritePermission) return null;
      return repository.token;
    },
    async owner(repository) {
      return repository.$relatedOwner();
    },
    async permissions(repository, args, context) {
      const hasWritePermission = await repository.$checkWritePermission(
        context.user
      );
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    async builds(repository, args) {
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
    async build(repository, { number }) {
      return Build.query()
        .where({ repositoryId: repository.id, number })
        .first();
    },
    async sampleBuildId(repository) {
      const build = await Build.query()
        .where({
          repositoryId: repository.id,
          number: 0,
        })
        .limit(1)
        .first();
      return build ? build.id : null;
    },
  },
  Query: {
    async repository(rootObj, args, context) {
      return getRepository({
        ownerLogin: args.ownerLogin,
        name: args.repositoryName,
        user: context.user,
      });
    },
  },
  Mutation: {
    async toggleRepository(source, { repositoryId, enabled }, context) {
      return transaction(async (trx) => {
        await checkUserRepositoryAccess(
          { user: context.user, repositoryId },
          { trx }
        );

        const repository = await Repository.query(trx).patchAndFetchById(
          repositoryId,
          { enabled }
        );

        if (!repository) {
          throw new APIError("Repository not found");
        }

        // We can skip further work when disabling a repository
        if (!enabled) {
          return repository;
        }

        if (!repository.token) {
          const token = await generateRandomBytes(20);
          return Repository.query(trx).patchAndFetchById(repositoryId, {
            token: token.toString("hex"),
          });
        }

        return repository;
      });
    },
    async updateReferenceBranch(
      source,
      { repositoryId, baselineBranch, useDefaultBranch },
      context
    ) {
      return transaction(async (trx) => {
        await checkUserRepositoryAccess(
          { user: context.user, repositoryId },
          { trx }
        );
        if (!baselineBranch && !useDefaultBranch)
          throw new APIError(
            "Baseline branch require to override the default branch"
          );
        return Repository.query(trx).patchAndFetchById(repositoryId, {
          useDefaultBranch,
          baselineBranch: useDefaultBranch ? null : baselineBranch.trim(),
        });
      });
    },
  },
};
