import gqlTag from "graphql-tag";

import { Account, Purchase, User } from "@argos-ci/database/models";
import { getTokenOctokit } from "@argos-ci/github";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    plan: Plan
    purchase: Purchase
    permissions: [Permission!]!
    projects(after: Int!, first: Int!): ProjectConnection!
    ghAccount: GithubAccount
    avatar: AccountAvatar!

    lastPurchase: Purchase
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
      return ctx.auth?.account || null;
    },
  },
  User: {
    lastPurchase: async (account: Account) => {
      if (!account.userId) {
        throw new Error("Invariant: account.userId is undefined");
      }
      return Purchase.query()
        .findOne({ purchaserId: account.userId })
        .orderBy("updatedAt");
    },
    teams: async (account: Account) => {
      if (!account.userId) {
        throw new Error("Invariant: account.userId is undefined");
      }
      return Account.query()
        .orderBy([
          { column: "name", order: "asc" },
          { column: "slug", order: "asc" },
        ])
        .whereIn(
          "teamId",
          User.relatedQuery("teams").select("teams.id").for(account.userId)
        );
    },
    ghInstallations: async (
      account: Account,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (account.id !== ctx.auth?.account.id) {
        throw new Error(
          "Invariant: ghInstallations can only be accessed by the authenticated user"
        );
      }
      const octokit = getTokenOctokit(ctx.auth.user.accessToken);
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
