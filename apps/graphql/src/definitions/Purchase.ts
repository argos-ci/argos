import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import { Plan } from "@argos-ci/database/models";
import { createStripeCheckoutSession } from "@argos-ci/stripe";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { APIError } from "../util.js";

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

  extend type Mutation {
    "Create a checkout session for a pro plan"
    createProPlanCheckoutSession(teamId: ID!): String!
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
      const remainingTime =
        new Date(purchase.trialEndDate).getTime() - Date.now();
      return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    },
  },
  Mutation: {
    createProPlanCheckoutSession: async (_root, { teamId }, ctx) => {
      if (!ctx.auth) {
        throw new APIError("Invalid user identification");
      }

      if (!teamId) {
        throw new Error("teamId missing");
      }

      const [account, proPlan] = await Promise.all([
        ctx.loaders.Account.load(teamId),
        Plan.query().findOne({ name: "pro", usageBased: true }),
      ]);
      if (!proPlan) {
        throw new Error("Pro plan not found");
      }

      const session = await createStripeCheckoutSession({
        plan: proPlan,
        account,
        purchaserId: ctx.auth.user.id,
        successUrl: new URL(
          `${account.slug}?checkout=success`,
          config.get("server.url")
        ).href,
        cancelUrl: new URL(
          `${account.slug}?checkout=cancel`,
          config.get("server.url")
        ).href,
      });
      if (!session.url) throw new Error("No session url");
      return session.url;
    },
  },
};
