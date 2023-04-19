import gqlTag from "graphql-tag";

import { Account, Project, Purchase } from "@argos-ci/database/models";

import type { Context } from "../context.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum AccountType {
    organization
    user
  }

  type Account implements Node {
    id: ID!
    type: AccountType!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    plan: Plan
    purchase: Purchase
    projects(after: Int!, first: Int!): ProjectConnection!
  }

  extend type Query {
    "Get account by slug"
    account(slug: String!): Account
  }
`;

export const resolvers = {
  Account: {
    stripeClientReferenceId: (
      account: Account,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Unauthorized");
      }
      return Purchase.encodeStripeClientReferenceId({
        accountId: account.id,
        purchaserId: ctx.auth.user.id,
      });
    },
    projects: async (
      account: Account,
      args: { first: number; after: number }
    ) => {
      const result = await Project.query()
        .where("accountId", account.id)
        .range(args.after, args.after + args.first - 1);
      return paginateResult({
        after: args.after,
        first: args.first,
        result,
      });
    },
    consumptionRatio: async (account: Account) => {
      return account.getScreenshotsConsumptionRatio();
    },
    currentMonthUsedScreenshots: async (account: Account) => {
      return account.getScreenshotsCurrentConsumption();
    },
    purchase: async (account: Account) => {
      return account.getActivePurchase();
    },
    plan: async (account: Account) => {
      return account.getPlan();
    },
    screenshotsLimitPerMonth: async (account: Account) => {
      return account.getScreenshotsMonthlyLimit();
    },
  },
  Query: {
    account: async (_root: null, args: { slug: string }) => {
      return Account.query().findOne({ slug: args.slug });
    },
  },
};
