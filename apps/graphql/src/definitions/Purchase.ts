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
    paymentMethodFilled: Boolean
    endDate: DateTime
    plan: Plan!
    trialEndDate: DateTime
    isTrialActive: Boolean!
    trialDaysRemaining: Int
  }
`;

export const resolvers: IResolvers = {
  Purchase: {
    account: async (purchase, _args, ctx) => {
      return ctx.loaders.Account.load(purchase.accountId);
    },
    plan: async (purchase, _args, ctx) => {
      return ctx.loaders.Plan.load(purchase.planId);
    },
    isTrialActive: (purchase) => {
      return purchase.$isTrialActive();
    },
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
