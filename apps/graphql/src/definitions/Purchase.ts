import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import { Plan, Purchase, Team } from "@argos-ci/database/models";
import {
  createStripeCheckoutSession,
  getCustomerSubscriptionOrThrow,
  terminateTrial,
} from "@argos-ci/stripe";

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
    hasPaidPlan: Boolean!
  }

  extend type Mutation {
    "End trial early"
    terminateTrial(purchaseId: ID!, stripeCustomerId: String): Purchase!
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
      return Boolean(
        purchase.trialEndDate && new Date() < new Date(purchase.trialEndDate)
      );
    },
    trialDaysRemaining: (purchase) => {
      if (!purchase.trialEndDate) return null;
      const remainingTime =
        new Date(purchase.trialEndDate).getTime() - Date.now();
      return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    },
    hasPaidPlan: async (purchase, _args, ctx) => {
      const plan = await ctx.loaders.Plan.load(purchase.planId);
      return Boolean(plan && plan.name !== "free");
    },
  },
  Mutation: {
    terminateTrial: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw new APIError("Invalid user identification");
      }

      const { purchaseId, stripeCustomerId } = args;

      if (!stripeCustomerId) {
        throw new Error("stripe customer id missing");
      }

      const purchase = await Purchase.query()
        .findById(purchaseId)
        .withGraphFetched("account")
        .throwIfNotFound({ message: `Purchase ${purchaseId} not found` });

      if (!purchase.account) {
        throw new Error("Invariant: purchase.account is undefined");
      }

      if (!purchase.account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }

      if (!Team.checkWritePermission(purchase.account.teamId, ctx.auth.user)) {
        throw new Error("Forbidden");
      }

      const subscription = await getCustomerSubscriptionOrThrow(
        stripeCustomerId
      );
      if (!subscription.trial_end) {
        return purchase;
      }

      await terminateTrial(subscription.id);
      return Purchase.query().patchAndFetchById(purchaseId, {
        trialEndDate: new Date().toISOString(),
      });
    },
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
