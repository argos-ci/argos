import gqlTag from "graphql-tag";

import { Account } from "@/database/models";
import {
  resumeStripeSubscription,
  scheduleStripeSubscriptionCancellation,
} from "@/stripe";

import {
  ICurrency,
  ISubscriptionCancelReason,
  type IResolvers,
} from "../__generated__/resolver-types";
import { getAdminAccount } from "../services/account";
import { badUserInput } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum AccountSubscriptionProvider {
    github
    stripe
  }

  enum Currency {
    USD
    EUR
  }

  type AccountSubscription implements Node {
    id: ID!
    provider: AccountSubscriptionProvider!
    trialDaysRemaining: Int
    endDate: DateTime
    paymentMethodFilled: Boolean!
    status: AccountSubscriptionStatus!
    currency: Currency!
  }

  """
  Why a subscriber is leaving.

  The values are Stripe's own \`cancellation_details.feedback\` vocabulary, so the
  answer travels to Stripe unchanged and lands in the same churn reports as the
  ones the billing portal used to collect.
  """
  enum SubscriptionCancelReason {
    "Too expensive for the value it brings"
    too_expensive
    "A needed feature is missing"
    missing_features
    "Moving to another tool"
    switched_service
    "Not used enough to be worth it"
    unused
    "Too hard to set up or to use"
    too_complex
    "The product did not work well enough"
    low_quality
    "Support was not good enough"
    customer_service
    "Something else, described in the comment"
    other
  }

  input CancelSubscriptionInput {
    accountId: ID!
    reason: SubscriptionCancelReason!
    "What the subscriber wrote in their own words"
    comment: String
  }

  input ResumeSubscriptionInput {
    accountId: ID!
  }

  extend type Mutation {
    "End the subscription when the current period ends, recording why"
    cancelSubscription(input: CancelSubscriptionInput!): Account!
    "Call off a scheduled cancellation"
    resumeSubscription(input: ResumeSubscriptionInput!): Account!
  }
`;

/**
 * The Stripe subscription a cancellation acts on.
 *
 * A team can be on a GitHub Marketplace plan or on a plan we forced by hand,
 * and neither is ours to stop from here — say so rather than failing on a
 * missing `stripeSubscriptionId` further down.
 */
async function getStripeSubscriptionIdOrThrow(
  account: Account,
): Promise<string> {
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();

  if (!subscription) {
    throw badUserInput("There is no active subscription on this account.");
  }

  if (
    subscription.provider !== "stripe" ||
    !subscription.stripeSubscriptionId
  ) {
    throw badUserInput(
      "This subscription is not managed by Stripe, it cannot be canceled from here.",
    );
  }

  return subscription.stripeSubscriptionId;
}

/**
 * Re-read the account after its subscription changed.
 *
 * `getStripeSubscriptionIdOrThrow` has already asked the instance we hold for
 * its subscription, and the subscription manager memoizes what it read — so
 * that instance still carries the row from before the change, and the client
 * would render the state it just left.
 */
async function refetchAccount(account: Account): Promise<Account> {
  return Account.query().findById(account.id).throwIfNotFound();
}

export const resolvers: IResolvers = {
  Mutation: {
    cancelSubscription: async (_root, args, ctx) => {
      const { accountId, reason, comment } = args.input;
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      const subscriptionId = await getStripeSubscriptionIdOrThrow(account);
      const trimmedComment = comment?.trim() || null;

      if (reason === ISubscriptionCancelReason.Other && !trimmedComment) {
        throw badUserInput("Tell us what went wrong so we can fix it.");
      }

      await scheduleStripeSubscriptionCancellation({
        subscriptionId,
        feedback: reason,
        comment: trimmedComment,
      });

      return refetchAccount(account);
    },
    resumeSubscription: async (_root, args, ctx) => {
      const account = await getAdminAccount({
        id: args.input.accountId,
        user: ctx.auth?.user,
      });
      const subscriptionId = await getStripeSubscriptionIdOrThrow(account);
      await resumeStripeSubscription(subscriptionId);
      return refetchAccount(account);
    },
  },
  AccountSubscription: {
    trialDaysRemaining: (subscription) => {
      if (!subscription.trialEndDate) {
        return null;
      }
      const trialEndDate = new Date(subscription.trialEndDate).getTime();
      const now = Date.now();
      if (trialEndDate < now) {
        return null;
      }
      const remainingTime =
        new Date(subscription.trialEndDate).getTime() - Date.now();
      return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    },
    currency: (subscription) => {
      switch (subscription.currency) {
        case "usd":
          return ICurrency.Usd;
        case "eur":
          return ICurrency.Eur;
        case null:
          return ICurrency.Usd;
      }
    },
  },
};
