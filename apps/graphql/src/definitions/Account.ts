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

  type AccountAvatar {
    url(size: Int!): String
    initial: String!
    color: String!
  }

  interface Account implements Node {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    plan: Plan
    purchase: Purchase
    permissions: [Permission!]!
    projects(after: Int!, first: Int!): ProjectConnection!
    ghAccount: GithubAccount
    avatar: AccountAvatar!
  }

  input UpdateAccountInput {
    id: ID!
    name: String
    slug: String
  }

  extend type Query {
    "Get Account by slug"
    account(slug: String!): Account
  }

  extend type Mutation {
    "Update Account"
    updateAccount(input: UpdateAccountInput!): Account!
  }
`;

type AccountAvatar = {
  getUrl(args: { size?: number }): string | null;
  initial: string;
  color: string;
};

const colors = [
  "#2a3b4c",
  "#10418e",
  "#4527a0",
  "#8ca1ee",
  "#65b7d7",
  "#65b793",
  "#00796b",
  "#9c1258",
  "#c20006",
  "#ff3d44",
  "#ffb83d",
  "#f58f00",
];

const getAvatarColor = (id: string): string => {
  const randomIndex = Number(id) % colors.length;
  return colors[randomIndex] ?? colors[0] ?? "#000";
};

export const resolvers = {
  Account: {
    __resolveType: (account: Account) => {
      switch (account.type) {
        case "team":
          return "Team";
        case "user":
          return "User";
        default:
          throw new Error(`Unknown account type: ${account.type}`);
      }
    },
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
    permissions: () => {
      // For now, everyone can read and write
      return ["read", "write"];
    },
    ghAccount: async (
      account: Account,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!account.githubAccountId) return null;
      return context.loaders.GithubAccount.load(account.githubAccountId);
    },
    avatar: async (
      account: Account,
      _args: never,
      context: Context
    ): Promise<AccountAvatar> => {
      const ghAccount = account.githubAccountId
        ? await context.loaders.GithubAccount.load(account.githubAccountId)
        : null;
      const initial = ((account.name || account.slug)[0] || "x").toUpperCase();
      const color = getAvatarColor(account.id);
      if (ghAccount) {
        return {
          getUrl: ({ size }: { size?: number }) => {
            const baseUrl = `https://github.com/${ghAccount.login}.png`;
            if (!size) {
              return baseUrl;
            }
            return `${baseUrl}?size=${size}`;
          },
          initial,
          color,
        };
      }
      return {
        getUrl: () => null,
        initial,
        color,
      };
    },
  },
  AccountAvatar: {
    url: (avatar: AccountAvatar, args: { size: number }) => {
      return avatar.getUrl(args);
    },
  },
  Query: {
    account: async (_root: null, args: { slug: string }, context: Context) => {
      if (!context.auth) return null;
      const account = await Account.query().findOne({ slug: args.slug });
      if (!account) return null;
      const hasWritePermission = await account.$checkWritePermission(
        context.auth.user
      );
      if (!hasWritePermission) return null;
      return account;
    },
  },
  Mutation: {
    updateAccount: async (
      _root: null,
      args: { input: { id: string; name?: string } },
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Unauthorized");
      }
      const { id, ...input } = args.input;
      const account = await Account.query().findById(id).throwIfNotFound();
      const hasWritePermission = await account.$checkWritePermission(
        ctx.auth.user
      );
      if (!hasWritePermission) {
        throw new Error("Unauthorized");
      }
      return account.$query().patch(input).returning("*");
    },
  },
};
