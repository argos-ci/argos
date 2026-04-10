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
    source: String!
    scope: [Account!]!
  }

  type CreateUserAccessTokenPayload {
    accessToken: UserAccessToken!
    "The token value, only returned once at creation"
    token: String!
  }

  input CreateUserAccessTokenInput {
    name: String!
    accountIds: [ID!]!
    expireInDays: Int
    source: String
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
    ): CreateUserAccessTokenPayload!
    "Update a personal access token"
    updateUserAccessToken(input: UpdateUserAccessTokenInput!): UserAccessToken!
    "Delete a personal access token"
    deleteUserAccessToken(input: DeleteUserAccessTokenInput!): User!
  }
`;

export const resolvers: IResolvers = {
  UserAccessToken: {
    scope: async (userAccessToken) => {
      const scopes = await UserAccessTokenScope.query()
        .where("userAccessTokenId", userAccessToken.id)
        .withGraphFetched("account");
      return scopes.map((scope) => {
        invariant(scope.account);
        return scope.account;
      });
    },
  },
  Mutation: {
    createUserAccessToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      const userId = ctx.auth.user.id;

      const { name, accountIds, expireInDays, source } = args.input;

      if (!name.trim()) {
        throw badUserInput("Token name cannot be empty");
      }

      const accessibleAccounts = await getAccessibleAccounts({
        accountIds,
        userId,
      });

      if (accessibleAccounts.length !== accountIds.length) {
        throw badUserInput("One or more accounts are not accessible");
      }

      const token = UserAccessToken.generateToken();
      const expireAt =
        expireInDays != null
          ? new Date(
              Date.now() + expireInDays * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null;

      const userAccessToken = await transaction(async (trx) => {
        const userAccessToken = await UserAccessToken.query(trx).insertAndFetch(
          {
            userId,
            name: name.trim(),
            token: hashToken(token),
            lastUsedAt: null,
            expireAt,
            source: source === "cli" ? "cli" : "user",
          },
        );

        await UserAccessTokenScope.query(trx).insert(
          accessibleAccounts.map((account) => ({
            userAccessTokenId: userAccessToken.id,
            accountId: account.id,
          })),
        );

        return userAccessToken;
      });

      return {
        accessToken: userAccessToken,
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

      return token.$query().patchAndFetch({
        name: trimmedName,
      });
    },
    deleteUserAccessToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { id } = args.input;

      await UserAccessToken.query().delete().where({
        id,
        userId: ctx.auth.user.id,
      });

      return ctx.auth.account;
    },
  },
};
