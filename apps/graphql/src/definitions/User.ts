import gqlTag from "graphql-tag";

import type { User } from "@argos-ci/database/models";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node & Owner {
    id: ID!
    clientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    email: String
    installations: [Installation!]!
    latestSynchronization: Synchronization
    login: String!
    name: String!
    permissions: [Permission!]!
    plan: Plan
    privateSync: Boolean!
    purchase: Purchase
    repositories(enabled: Boolean): [Repository!]!
    repositoriesNumber: Int!
    screenshotsLimitPerMonth: Int
    stripeCustomerId: String
    type: OwnerType!
  }

  extend type Query {
    "Get the authenticated user"
    user: User
  }
`;

export const resolvers = {
  Query: {
    user: async (_root: null, _args: Record<string, never>, ctx: Context) => {
      return ctx.user || null;
    },
  },
  User: {
    installations: async (user: User) => {
      return user.$relatedQuery("installations");
    },
    latestSynchronization: async (user: User) => {
      return user.$relatedQuery("synchronizations").first();
    },
    type: () => "user",
  },
};
