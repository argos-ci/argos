import gqlTag from "graphql-tag";

import { Purchase, Team } from "@argos-ci/database/models";
import {
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
    trialEndDate: DateTime
    plan: Plan!
  }

  extend type Mutation {
    "End trial early"
    terminateTrial(purchaseId: ID!, stripeCustomerId: String): Purchase!
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
  },
  Mutation: {
    terminateTrial: async (_root, args, ctx) => {
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

      if (!ctx.auth) {
        throw new APIError("Invalid user identification");
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
  },
};
