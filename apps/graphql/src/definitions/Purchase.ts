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
    trialDaysRemaining: Int
  }
`;

export const resolvers: IResolvers = {
  Purchase: {
    trialDaysRemaining: (purchase) => {
      if (!purchase.trialEndDate) return null;
      const trialEndDate = new Date(purchase.trialEndDate).getTime();
      const now = Date.now();
      if (trialEndDate < now) return null;
      const remainingTime =
        new Date(purchase.trialEndDate).getTime() - Date.now();
      return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    },
  },
};
