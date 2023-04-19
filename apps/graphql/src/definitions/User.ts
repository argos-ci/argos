import gqlTag from "graphql-tag";

import { Purchase, User } from "@argos-ci/database/models";
import { getTokenOctokit } from "@argos-ci/github";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node {
    id: ID!
    lastPurchase: Purchase
    account: Account!
    teams: [Team!]!
    ghInstallations: GhApiInstallationConnection!
  }

  type UserConnection implements Connection {
    pageInfo: PageInfo!
    edges: [User!]!
  }

  extend type Query {
    "Get the authenticated user"
    me: User
  }
`;

export const resolvers = {
  Query: {
    me: async (_root: null, _args: Record<string, never>, ctx: Context) => {
      return ctx.auth?.user || null;
    },
  },
  User: {
    account: async (user: User, _args: Record<string, never>, ctx: Context) => {
      return ctx.loaders.AccountFromRelation.load({ userId: user.id });
    },
    lastPurchase: async (user: User) => {
      return Purchase.query()
        .findOne({ purchaserId: user.id })
        .orderBy("updatedAt");
    },
    teams: async (user: User) => {
      return user.$relatedQuery("teams");
    },
    ghInstallations: async (user: User) => {
      const octokit = getTokenOctokit(user.accessToken);
      const apiInstallations =
        await octokit.apps.listInstallationsForAuthenticatedUser({
          per_page: 100,
        });
      return {
        edges: apiInstallations.data.installations,
        pageInfo: {
          hasNextPage: false,
          totalCount: apiInstallations.data.total_count,
        },
      };
    },
  },
};
