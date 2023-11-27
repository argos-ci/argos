import { GraphQLError } from "graphql";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";
import axios from "axios";

import { knex } from "@/database/index.js";
import { Account, Plan, Project, Purchase } from "@/database/models/index.js";
import {
  encodeStripeClientReferenceId,
  terminateStripeTrial,
  updatePurchaseFromSubscription,
} from "@/stripe/index.js";

import {
  IPermission,
  IPurchaseSource,
  IPurchaseStatus,
  IResolvers,
  ITrialStatus,
} from "../__generated__/resolver-types.js";
import type { Context } from "../context.js";
import { getWritableAccount } from "../services/account.js";
import { unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";
import { checkAccountSlug } from "@/database/services/account.js";
import {
  getGitlabClientFromAccount,
  getTokenGitlabClient,
} from "@/gitlab/index.js";
import { invariant } from "@/util/invariant.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type AccountAvatar {
    url(size: Int!): String
    initial: String!
    color: String!
  }

  enum PurchaseStatus {
    "Ongoing paid purchase"
    active
    "Ongoing trial"
    trialing
    "No paid purchase"
    missing
    "Payment due"
    past_due
    "Post-cancelation date"
    canceled
  }

  enum TrialStatus {
    "Trial is active"
    active
    "Subscription ended when trial did"
    expired
  }

  interface Account implements Node {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    hasPaidPlan: Boolean!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    plan: Plan
    periodStartDate: DateTime
    periodEndDate: DateTime
    purchase: Purchase
    purchaseStatus: PurchaseStatus
    trialStatus: TrialStatus
    hasForcedPlan: Boolean!
    pendingCancelAt: DateTime
    permissions: [Permission!]!
    projects(after: Int!, first: Int!): ProjectConnection!
    ghAccount: GithubAccount
    avatar: AccountAvatar!
    paymentProvider: PurchaseSource
    vercelConfiguration: VercelConfiguration
    gitlabAccessToken: String
    glNamespaces: GlApiNamespaceConnection
  }

  input UpdateAccountInput {
    id: ID!
    name: String
    slug: String
    gitlabAccessToken: String
  }

  extend type Query {
    "Get Account by slug"
    account(slug: String!): Account
    "Get Account by id"
    accountById(id: ID!): Account
    "Get Team by id"
    teamById(id: ID!): Team
  }

  extend type Mutation {
    "Update Account"
    updateAccount(input: UpdateAccountInput!): Account!
    "Terminate trial early"
    terminateTrial(accountId: ID!): Account!
  }
`;

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

const accountById = async (
  _root: unknown,
  args: { id: string },
  ctx: Context,
) => {
  if (!ctx.auth) return null;
  const account = await Account.query().findById(args.id);
  if (!account) return null;
  const hasReadPermission = await account.$checkReadPermission(ctx.auth.user);
  if (!hasReadPermission) return null;
  return account;
};

export const resolvers: IResolvers = {
  Account: {
    __resolveType: (account) => {
      switch (account.type) {
        case "team":
          return "Team";
        case "user":
          return "User";
        default:
          throw new Error(`Unknown account type: ${account.type}`);
      }
    },
    stripeClientReferenceId: (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return encodeStripeClientReferenceId({
        accountId: account.id,
        purchaserId: ctx.auth.user.id,
      });
    },
    projects: async (account, args) => {
      const result = await Project.query()
        .where("accountId", account.id)
        .range(args.after, args.after + args.first - 1);
      return paginateResult({
        after: args.after,
        first: args.first,
        result,
      });
    },
    hasPaidPlan: async (account) => {
      const subscription = account.$getSubscription();
      const free = await subscription.checkIsFreePlan();
      return !free;
    },
    consumptionRatio: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getCurrentPeriodConsumptionRatio();
    },
    currentMonthUsedScreenshots: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getCurrentPeriodScreenshots();
    },
    periodStartDate: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getCurrentPeriodStartDate();
    },
    periodEndDate: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getCurrentPeriodEndDate();
    },
    purchase: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getActivePurchase();
    },
    purchaseStatus: async (account) => {
      if (account.forcedPlanId !== null) {
        return IPurchaseStatus.Active;
      }
      if (account.type === "user") {
        return null;
      }

      const subscription = account.$getSubscription();
      const purchase = await subscription.getActivePurchase();

      if (purchase) {
        return purchase.status as IPurchaseStatus;
      }

      const hasOldPaidPurchase = await Purchase.query()
        .where("accountId", account.id)
        .whereNot({ name: "free" })
        .whereRaw("?? < now()", "endDate")
        .where("endDate", "<>", knex.ref("trialEndDate"))
        .joinRelated("plan")
        .orderBy("endDate", "DESC")
        .limit(1)
        .resultSize();

      if (hasOldPaidPurchase) return IPurchaseStatus.Canceled;

      // No paid purchase
      return IPurchaseStatus.Missing;
    },
    trialStatus: async (account) => {
      if (account.type === "user") {
        return null;
      }
      const subscription = account.$getSubscription();
      const trialing = await subscription.checkIsTrialing();

      if (trialing) {
        return ITrialStatus.Active;
      }

      const previousPaidPurchase = await Purchase.query()
        .where("accountId", account.id)
        .whereNot({ name: "free" })
        .whereRaw("?? < now()", "endDate")
        .joinRelated("plan")
        .orderBy("endDate", "DESC")
        .first();

      const purchaseEndsAtTrialEnd =
        previousPaidPurchase &&
        previousPaidPurchase.endDate === previousPaidPurchase.trialEndDate;

      return purchaseEndsAtTrialEnd ? ITrialStatus.Expired : null;
    },
    hasForcedPlan: async (account) => {
      return account.forcedPlanId !== null;
    },
    pendingCancelAt: async (account) => {
      if (account.type === "user") {
        return null;
      }
      const subscription = account.$getSubscription();
      const activePurchase = await subscription.getActivePurchase();
      return activePurchase?.endDate ?? null;
    },
    plan: async (account) => {
      const subscription = account.$getSubscription();
      return subscription.getPlan();
    },
    screenshotsLimitPerMonth: async (account) => {
      const subscription = account.$getSubscription();
      const plan = await subscription.getPlan();
      return Plan.getScreenshotMonthlyLimitForPlan(plan);
    },
    permissions: async (account, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }
      const writable = await account.$checkWritePermission(ctx.auth.user);
      return writable
        ? [IPermission.Read, IPermission.Write]
        : [IPermission.Read];
    },
    gitlabAccessToken: async (account, _args, ctx) => {
      if (!ctx.auth) return null;
      const writable = await account.$checkWritePermission(ctx.auth.user);
      if (!writable) return account.gitlabAccessToken ? `••••••••` : null;
      return account.gitlabAccessToken || null;
    },
    ghAccount: async (account, _args, ctx) => {
      if (!account.githubAccountId) return null;
      return ctx.loaders.GithubAccount.load(account.githubAccountId);
    },
    paymentProvider: async (account) => {
      if (account.type === "user") return null;
      const lastPurchase = await Purchase.query()
        .orderBy("createdAt", "DESC")
        .where("accountId", account.id)
        .first();
      if (!lastPurchase) return null;
      return lastPurchase.source as IPurchaseSource;
    },
    avatar: async (account, _args, ctx) => {
      const ghAccount = account.githubAccountId
        ? await ctx.loaders.GithubAccount.load(account.githubAccountId)
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

      if (account.userId) {
        const user = await ctx.loaders.User.load(account.userId);
        invariant(user, "User not found");
        if (user.gitlabUserId && user.email) {
          const email = user.email;
          return {
            getUrl: async ({ size }: { size?: number }) => {
              const url = new URL("https://gitlab.com/api/v4/avatar");
              url.searchParams.set("email", email);
              if (size) {
                url.searchParams.set("size", String(size));
              }
              const result = await axios.get<{ avatar_url: string }>(
                String(url),
              );
              return result.data.avatar_url;
            },
            initial,
            color,
          };
        }
      }

      return {
        getUrl: () => null,
        initial,
        color,
      };
    },
    vercelConfiguration: async (account, _args, ctx) => {
      if (!account.vercelConfigurationId) return null;
      const configuration = await ctx.loaders.VercelConfiguration.load(
        account.vercelConfigurationId,
      );
      if (!configuration) return null;
      if (configuration.deleted) return null;
      return configuration;
    },
    glNamespaces: async (account) => {
      const client = await getGitlabClientFromAccount(account);
      if (!client) return null;
      const namespaces = await client.Namespaces.all();
      return {
        edges: namespaces,
        pageInfo: {
          hasNextPage: false,
          totalCount: namespaces.length,
        },
      };
    },
  },
  AccountAvatar: {
    url: (avatar, args) => {
      return avatar.getUrl(args);
    },
  },
  Query: {
    account: async (_root, args, ctx) => {
      if (!ctx.auth) return null;
      const account = await Account.query().findOne({ slug: args.slug });
      if (!account) return null;
      const hasReadPermission = await account.$checkReadPermission(
        ctx.auth.user,
      );
      if (!hasReadPermission) return null;
      return account;
    },
    accountById,
    teamById: accountById,
  },
  Mutation: {
    updateAccount: async (_root, args, ctx) => {
      const { id, ...input } = args.input;
      const account = await getWritableAccount({ id, user: ctx.auth?.user });

      const data: PartialModelObject<Account> = {};

      if (input.slug && account.slug !== input.slug) {
        try {
          checkAccountSlug(input.slug);
        } catch (error: unknown) {
          if (error instanceof Error) {
            throw new GraphQLError(error.message, {
              extensions: {
                code: "BAD_USER_INPUT",
                field: "slug",
              },
            });
          }
          throw error;
        }
        data.slug = input.slug;
      }

      if (input.name !== undefined) {
        data.name = input.name;
      }

      if (
        input.gitlabAccessToken !== undefined &&
        account.gitlabAccessToken !== input.gitlabAccessToken
      ) {
        data.gitlabAccessToken = input.gitlabAccessToken;

        if (input.gitlabAccessToken) {
          const gitlabClient = getTokenGitlabClient(input.gitlabAccessToken);
          try {
            const res = await gitlabClient.PersonalAccessTokens.show();
            if (!res.scopes?.includes("api")) {
              throw new GraphQLError(
                "The provided GitLab access token does not have the `api` scope. Please create a new one with the `api` scope.",
                {
                  extensions: {
                    code: "BAD_USER_INPUT",
                    field: "gitlabAccessToken",
                  },
                },
              );
            }
          } catch (error: unknown) {
            if (error instanceof Error) {
              if (error.message === "Unauthorized") {
                throw new GraphQLError(
                  "The provided GitLab access token is not valid.",
                  {
                    extensions: {
                      code: "BAD_USER_INPUT",
                      field: "gitlabAccessToken",
                    },
                  },
                );
              }
            }
            throw error;
          }
        }
      }

      return account.$query().patchAndFetch(data);
    },
    terminateTrial: async (_root, args, ctx) => {
      const { accountId } = args;
      const account = await getWritableAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      const subscription = account.$getSubscription();
      const purchase = await subscription.getActivePurchase();

      // No purchase
      if (!purchase) {
        return account;
      }

      // Not a stripe purchase
      if (purchase.source !== "stripe" || !purchase.stripeSubscriptionId) {
        return account;
      }

      // Not a trial
      if (!purchase.$isTrialActive()) {
        return account;
      }

      const stripeSubscription = await terminateStripeTrial(
        purchase.stripeSubscriptionId,
      );
      await updatePurchaseFromSubscription(purchase, stripeSubscription);
      return account;
    },
  },
};
