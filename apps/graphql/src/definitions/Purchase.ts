import gqlTag from "graphql-tag";

import type { Purchase } from "@argos-ci/database/models";

import type { Context } from "../context.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum PurchaseSource {
    github
    stripe
  }

  type Purchase implements Node {
    id: ID!
    source: PurchaseSource!
    account: Account!
  }
`;

export const resolvers = {
  Purchase: {
    account: async (
      purchase: Purchase,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      return ctx.loaders.Account.load(purchase.accountId);
    },
  },
};
