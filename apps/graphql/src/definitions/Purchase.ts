import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

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

export const resolvers: IResolvers = {
  Purchase: {
    account: async (purchase, _args, ctx) => {
      return ctx.loaders.Account.load(purchase.accountId);
    },
  },
};
