import gqlTag from "graphql-tag";

import { Purchase, User } from "@argos-ci/database/models";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node {
    id: ID!
    lastPurchase: Purchase
    account: Account!
    teams: [Team!]!
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
    account: async (user: User) => {
      return user.$relatedQuery("account");
    },
    lastPurchase: async (user: User) => {
      return Purchase.query()
        .findOne({ purchaserId: user.id })
        .orderBy("updatedAt");
    },
    teams: async (user: User) => {
      return user.$relatedQuery("teams");
    },
  },
};
