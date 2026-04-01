import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { transaction } from "@/database/transaction";

import type { IResolvers } from "../__generated__/resolver-types";
import { getAccessibleAccounts } from "../services/account";
import { badUserInput, forbidden } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  type UserAccessToken {
    id: ID!
    name: String!
    createdAt: DateTime!
    expireAt: DateTime
    lastUsedAt: DateTime
    createdBy: String!
    scope: [Account!]!
  }

  type CreatedUserAccessToken {
    id: ID!
    name: String!
    createdAt: DateTime!
    expireAt: DateTime
    lastUsedAt: DateTime
    createdBy: String!
    scope: [Account!]!
    "The token value, only returned once at creation"
    token: String!
  }

  input CreateUserAccessTokenInput {
    name: String!
    accountIds: [ID!]!
    expireInDays: Int
  }

  input DeleteUserAccessTokenInput {
    id: ID!
  }

  input UpdateUserAccessTokenInput {
    id: ID!
    name: String!
  }

  extend type Mutation {
    "Create a personal access token"
    createUserAccessToken(
      input: CreateUserAccessTokenInput!
    ): CreatedUserAccessToken!
    "Update a personal access token"
    updateUserAccessToken(input: UpdateUserAccessTokenInput!): UserAccessToken!
    "Delete a personal access token"
    deleteUserAccessToken(input: DeleteUserAccessTokenInput!): User!
  }
`;

export const resolvers: IResolvers = {
  Mutation: {
    createUserAccessToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { name, accountIds, expireInDays } = args.input;

      if (!name.trim()) {
        throw badUserInput("Token name cannot be empty");
      }

      const accessibleAccounts = await getAccessibleAccounts({
        accountIds,
        userId: ctx.auth.user.id,
      });

      if (accessibleAccounts.length !== accountIds.length) {
        throw badUserInput("One or more accounts are not accessible");
      }

      const token = UserAccessToken.generateToken();
      const userId = ctx.auth.user.id;
      const expireAt =
        expireInDays != null
          ? new Date(
              Date.now() + expireInDays * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null;

      const userAccessToken = await transaction(async (trx) => {
        const userAccessToken = await UserAccessToken.query(trx).insert({
          userId,
          name: name.trim(),
          token: hashToken(token),
          lastUsedAt: null,
          expireAt,
          createdBy: "user",
        });

        await UserAccessTokenScope.query(trx).insert(
          accessibleAccounts.map((account) => ({
            userAccessTokenId: userAccessToken.id,
            accountId: account.id,
          })),
        );

        return userAccessToken;
      });

      return {
        ...userAccessToken,
        createdAt: new Date(userAccessToken.createdAt),
        expireAt: userAccessToken.expireAt
          ? new Date(userAccessToken.expireAt)
          : null,
        lastUsedAt: null,
        scope: accessibleAccounts,
        token,
      };
    },
    updateUserAccessToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { id, name } = args.input;
      const trimmedName = name.trim();

      if (!trimmedName) {
        throw badUserInput("Token name cannot be empty");
      }

      const token = await UserAccessToken.query().findOne({
        id,
        userId: ctx.auth.user.id,
      });

      if (!token) {
        throw badUserInput("Token not found");
      }

      const updated = await token.$query().patchAndFetch({
        name: trimmedName,
      });

      const scopes = await UserAccessTokenScope.query()
        .where("userAccessTokenId", updated.id)
        .withGraphFetched("account");

      return {
        ...updated,
        createdAt: new Date(updated.createdAt),
        expireAt: updated.expireAt ? new Date(updated.expireAt) : null,
        lastUsedAt: updated.lastUsedAt ? new Date(updated.lastUsedAt) : null,
        scope: scopes.map((scope) => {
          invariant(scope.account, "scope.account is undefined");
          return scope.account;
        }),
      };
    },
    deleteUserAccessToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { id } = args.input;

      const token = await UserAccessToken.query().findOne({
        id,
        userId: ctx.auth.user.id,
      });

      if (!token) {
        return ctx.auth.account;
      }

      await transaction(async (trx) => {
        await UserAccessTokenScope.query(trx)
          .where("userAccessTokenId", token.id)
          .delete();
        await token.$query(trx).delete();
      });

      return ctx.auth.account;
    },
  },
};
