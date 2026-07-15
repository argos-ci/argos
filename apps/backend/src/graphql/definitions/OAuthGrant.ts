import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { OAuthClient, OAuthGrant, OAuthGrantAccount } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { revokeGrant } from "@/oauth/tokens";

import type { IResolvers } from "../__generated__/resolver-types";
import { badUserInput, forbidden, invalidId } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  "An OAuth application the user has authorized (an active grant)."
  type AuthorizedApp {
    id: ID!
    client: OAuthClient!
    scopes: [String!]!
    "Organizations this application is allowed to act on."
    accounts: [Account!]!
    createdAt: DateTime!
    lastUsedAt: DateTime
  }

  input RevokeOAuthGrantInput {
    id: ID!
  }

  extend type User {
    "Applications you have authorized to access your account via OAuth."
    authorizedApps: [AuthorizedApp!]!
  }

  extend type Mutation {
    "Revoke an authorized OAuth application, invalidating its tokens."
    revokeOAuthGrant(input: RevokeOAuthGrantInput!): User!
  }
`;

export const resolvers: IResolvers = {
  AuthorizedApp: {
    client: async (grant) => {
      const client = await OAuthClient.query().findById(grant.oauthClientId);
      invariant(client, "OAuth grant without a client");
      return client;
    },
    accounts: async (grant) => {
      const grantAccounts = await OAuthGrantAccount.query()
        .where("oauthGrantId", grant.id)
        .withGraphFetched("account");
      return grantAccounts.map((entry) => {
        invariant(entry.account);
        return entry.account;
      });
    },
  },
  User: {
    authorizedApps: async (account, _args, ctx) => {
      invariant(
        account.userId,
        "authorizedApps can only be resolved for user accounts",
      );
      if (ctx.auth?.user.id !== account.userId) {
        throw forbidden();
      }
      return OAuthGrant.query()
        .where("userId", account.userId)
        .whereNull("revokedAt")
        .orderBy("createdAt", "desc");
    },
  },
  Mutation: {
    revokeOAuthGrant: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      const { id } = args.input;
      if (!isValidPgBigInt(id)) {
        throw invalidId();
      }
      const grant = await OAuthGrant.query().findOne({
        id,
        userId: ctx.auth.user.id,
      });
      if (!grant) {
        throw badUserInput("Application not found");
      }
      await revokeGrant(grant.id);
      return ctx.auth.account;
    },
  },
};
