import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import axios from "axios";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import {
  Account,
  Plan,
  Project,
  ProjectUser,
  Subscription,
  TeamUser,
} from "@/database/models/index.js";
import { checkAccountSlug } from "@/database/services/account.js";
import {
  getGitlabClientFromAccount,
  getTokenGitlabClient,
} from "@/gitlab/index.js";
import {
  encodeStripeClientReferenceId,
  terminateStripeTrial,
  updateArgosSubscriptionFromStripe,
} from "@/stripe/index.js";

import {
  IAccountPermission,
  IAccountSubscriptionProvider,
  IAccountSubscriptionStatus,
  IResolvers,
  ITrialStatus,
} from "../__generated__/resolver-types.js";
import type { Context } from "../context.js";
import { getAdminAccount } from "../services/account.js";
import { getAvatarColor, githubAvatarUrlFactory } from "../services/avatar.js";
import { badUserInput, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type AccountAvatar {
    url(size: Int!): String
    initial: String!
    color: String!
  }

  enum AccountSubscriptionStatus {
    "Ongoing paid subscription"
    active
    "Ongoing trial"
    trialing
    "Payment due"
    past_due
    "Post-cancelation date"
    canceled
    "Incomplete"
    incomplete
    "Incomplete expired"
    incomplete_expired
    "Unpaid"
    unpaid
    "Paused"
    paused
  }

  enum TrialStatus {
    "Trial is active"
    active
    "Subscription ended when trial did"
    expired
  }

  enum AccountPermission {
    admin
    view
  }

  interface Account implements Node {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    hasPaidPlan: Boolean!
    consumptionRatio: Float!
    currentPeriodScreenshots: Int!
    includedScreenshots: Int!
    slug: String!
    name: String
    plan: Plan
    periodStartDate: DateTime
    periodEndDate: DateTime
    subscription: AccountSubscription
    subscriptionStatus: AccountSubscriptionStatus
    trialStatus: TrialStatus
    hasForcedPlan: Boolean!
    pendingCancelAt: DateTime
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    avatar: AccountAvatar!
    paymentProvider: AccountSubscriptionProvider
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

const accountById = async (
  _root: unknown,
  args: { id: string },
  ctx: Context,
) => {
  if (!ctx.auth) {
    return null;
  }
  const account = await Account.query().findById(args.id);
  if (!account) {
    return null;
  }
  const permissions = await account.$getPermissions(ctx.auth.user);
  if (!permissions.includes("view")) {
    return null;
  }
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
          assertNever(account.type);
      }
    },
    stripeClientReferenceId: (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return encodeStripeClientReferenceId({
        accountId: account.id,
        subscriberId: ctx.auth.user.id,
      });
    },
    projects: async (account, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const projectsQuery = Project.query()
        .where("accountId", account.id)
        // Sort by most recently created project or build
        .orderByRaw(
          `greatest(projects."createdAt", (select max("createdAt") from builds where builds."projectId" = projects.id)) desc`,
        )
        .range(args.after, args.after + args.first - 1);

      // Staff can view all projects
      if (auth.user.staff) {
        const result = await projectsQuery;
        return paginateResult({
          after: args.after,
          first: args.first,
          result,
        });
      }

      switch (account.type) {
        case "user": {
          if (account.userId !== auth.user.id) {
            throw unauthenticated();
          }

          const result = await projectsQuery;
          return paginateResult({
            after: args.after,
            first: args.first,
            result,
          });
        }
        case "team": {
          const teamUserQuery = TeamUser.query().where({
            teamId: account.teamId,
            userId: auth.user.id,
          });

          const result = await projectsQuery.where((qb) => {
            // User is a team member or owner
            qb.whereExists(
              teamUserQuery.clone().whereIn("userLevel", ["owner", "member"]),
            ).orWhere((qb) => {
              // User is a contributor
              qb.whereExists(
                teamUserQuery.clone().where("userLevel", "contributor"),
              )
                // And is a contributor to the project
                .whereExists(
                  ProjectUser.query()
                    .whereRaw(`projects.id = project_users."projectId"`)
                    .where("userId", auth.user.id),
                );
            });
          });

          return paginateResult({
            after: args.after,
            first: args.first,
            result,
          });
        }
        default:
          assertNever(account.type);
      }
    },
    hasPaidPlan: async (account) => {
      const manager = account.$getSubscriptionManager();
      const plan = await manager.getPlan();
      return Boolean(plan && !Plan.checkIsFreePlan(plan));
    },
    consumptionRatio: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodConsumptionRatio();
    },
    currentPeriodScreenshots: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodScreenshots();
    },
    includedScreenshots: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getIncludedScreenshots();
    },
    periodStartDate: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodStartDate();
    },
    periodEndDate: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodEndDate();
    },
    subscription: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getActiveSubscription();
    },
    subscriptionStatus: async (account) => {
      const manager = account.$getSubscriptionManager();
      const status = await manager.getSubscriptionStatus();
      return status as IAccountSubscriptionStatus;
    },
    trialStatus: async (account) => {
      if (account.type === "user") {
        return null;
      }
      const manager = account.$getSubscriptionManager();
      const trialing = await manager.checkIsTrialing();

      if (trialing) {
        return ITrialStatus.Active;
      }

      const previousPaidSubscription = await Subscription.query()
        .where("accountId", account.id)
        .whereNot({ name: "free" })
        .whereRaw("?? < now()", "endDate")
        .joinRelated("plan")
        .orderBy("endDate", "DESC")
        .first();

      const subscriptionEndsAtTrialEnd =
        previousPaidSubscription &&
        previousPaidSubscription.endDate ===
          previousPaidSubscription.trialEndDate;

      return subscriptionEndsAtTrialEnd ? ITrialStatus.Expired : null;
    },
    hasForcedPlan: async (account) => {
      return account.forcedPlanId !== null;
    },
    pendingCancelAt: async (account) => {
      if (account.type === "user") {
        return null;
      }
      const manager = account.$getSubscriptionManager();
      const subscription = await manager.getActiveSubscription();
      return subscription?.endDate ?? null;
    },
    plan: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getPlan();
    },
    permissions: async (account, _args, ctx) => {
      const permissions = await account.$getPermissions(ctx.auth?.user ?? null);
      return permissions as IAccountPermission[];
    },
    gitlabAccessToken: async (account, _args, ctx) => {
      if (!account.gitlabAccessToken) {
        return null;
      }
      const permissions = await account.$getPermissions(ctx.auth?.user ?? null);
      if (!permissions.includes("admin")) {
        return `••••••••`;
      }
      return account.gitlabAccessToken;
    },
    paymentProvider: async (account) => {
      if (account.type === "user") {
        return null;
      }
      const lastSubscription = await Subscription.query()
        .orderBy("createdAt", "DESC")
        .where("accountId", account.id)
        .first();
      if (!lastSubscription) {
        return null;
      }
      return lastSubscription.provider as IAccountSubscriptionProvider;
    },
    avatar: async (account, _args, ctx) => {
      const ghAccount = account.githubAccountId
        ? await ctx.loaders.GithubAccount.load(account.githubAccountId)
        : null;

      const initial = ((account.name || account.slug)[0] || "x").toUpperCase();
      const color = getAvatarColor(account.id);

      if (ghAccount) {
        return {
          getUrl: githubAvatarUrlFactory(ghAccount.login),
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
      const account = await Account.query().findOne({ slug: args.slug });
      if (!account) {
        return null;
      }
      const permissions = await account.$getPermissions(ctx.auth?.user ?? null);
      if (!permissions.includes("view")) {
        return null;
      }
      return account;
    },
    accountById,
    teamById: accountById,
  },
  Mutation: {
    updateAccount: async (_root, args, ctx) => {
      const { id, ...input } = args.input;
      const account = await getAdminAccount({ id, user: ctx.auth?.user });

      const data: PartialModelObject<Account> = {};

      if (input.slug && account.slug !== input.slug) {
        try {
          await checkAccountSlug(input.slug);
        } catch (error: unknown) {
          if (error instanceof Error) {
            throw badUserInput(error.message, { field: "slug" });
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
              throw badUserInput(
                "The provided GitLab access token does not have the `api` scope. Please create a new one with the `api` scope.",
                {
                  field: "gitlabAccessToken",
                },
              );
            }
          } catch (error: unknown) {
            if (error instanceof Error) {
              if (error.message === "Unauthorized") {
                throw badUserInput(
                  "The provided GitLab access token is not valid.",
                  { field: "gitlabAccessToken" },
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
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      const manager = account.$getSubscriptionManager();
      const argosSubscription = await manager.getActiveSubscription();

      // No subscription
      if (!argosSubscription) {
        return account;
      }

      // Not a stripe subscription
      if (argosSubscription.provider !== "stripe") {
        return account;
      }

      // Not a trial
      if (!argosSubscription.$isTrialActive()) {
        return account;
      }

      invariant(
        argosSubscription.stripeSubscriptionId,
        "no stripeSubscriptionId for stripe subscription",
      );

      const stripeSubscription = await terminateStripeTrial(
        argosSubscription.stripeSubscriptionId,
      );
      await updateArgosSubscriptionFromStripe(
        argosSubscription,
        stripeSubscription,
      );
      return account;
    },
  },
};
