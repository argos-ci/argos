import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { GitbeakerRequestError } from "@gitbeaker/rest";
import axios from "axios";
import gqlTag from "graphql-tag";
import type { PartialModelObject } from "objection";

import { disconnectGitHubAuth } from "@/auth/github.js";
import { disconnectGitLabAuth } from "@/auth/gitlab.js";
import { disconnectGoogleAuth } from "@/auth/google.js";
import {
  Account,
  Project,
  ProjectUser,
  TeamUser,
} from "@/database/models/index.js";
import { checkAccountSlug } from "@/database/services/account.js";
import { getSpendLimitThreshold } from "@/database/services/spend-limit.js";
import { getGitlabClient, getGitlabClientFromAccount } from "@/gitlab/index.js";
import {
  getAccountBuildMetrics,
  getAccountScreenshotMetrics,
} from "@/metrics/account.js";
import { sendNotification } from "@/notification/index.js";
import { boltApp } from "@/slack/app.js";
import { uninstallSlackInstallation } from "@/slack/helpers";
import { encodeStripeClientReferenceId } from "@/stripe/index.js";

import {
  IAccountPermission,
  IAccountSubscriptionStatus,
  IResolvers,
} from "../__generated__/resolver-types.js";
import type { Context } from "../context.js";
import { getAdminAccount } from "../services/account.js";
import { getAvatarColor, githubAvatarUrlFactory } from "../services/avatar.js";
import { badUserInput, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

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
    "Trial expired"
    trial_expired
  }

  enum AccountPermission {
    admin
    view
  }

  type AccountMetricDataPoint {
    ts: Timestamp!
    total: Int!
    projects: JSONObject!
  }

  type AccountMetricData {
    total: Int!
    projects: JSONObject!
  }

  type AccountScreenshotMetrics {
    series: [AccountMetricDataPoint!]!
    all: AccountMetricData!
    projects: [Project!]!
  }

  type AccountBuildsMetrics {
    series: [AccountMetricDataPoint!]!
    all: AccountMetricData!
    projects: [Project!]!
  }

  type AccountMetrics {
    screenshots: AccountScreenshotMetrics!
    builds: AccountBuildsMetrics!
  }

  input AccountMetricsInput {
    projectIds: [ID!]
    from: DateTime!
    groupBy: TimeSeriesGroupBy!
  }

  interface Account implements Node {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float!
    currentPeriodScreenshots: Int!
    additionalScreenshotsCost: Float!
    includedScreenshots: Int!
    slug: String!
    name: String
    plan: Plan
    periodStartDate: DateTime
    periodEndDate: DateTime
    subscription: AccountSubscription
    subscriptionStatus: AccountSubscriptionStatus
    hasForcedPlan: Boolean!
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    avatar: AccountAvatar!
    gitlabAccessToken: String
    gitlabBaseUrl: String
    glNamespaces: GlApiNamespaceConnection
    slackInstallation: SlackInstallation
    githubAccount: GithubAccount
    metrics(input: AccountMetricsInput!): AccountMetrics!
    meteredSpendLimitByPeriod: Int
    blockWhenSpendLimitIsReached: Boolean!
  }

  input UpdateAccountInput {
    id: ID!
    name: String
    slug: String
    gitlabAccessToken: String
    meteredSpendLimitByPeriod: Int
    blockWhenSpendLimitIsReached: Boolean
  }

  input UninstallSlackInput {
    accountId: ID!
  }

  input DisconnectGitHubAuthInput {
    accountId: ID!
  }

  input DisconnectGitLabAuthInput {
    accountId: ID!
  }

  input DisconnectGoogleAuthInput {
    accountId: ID!
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
    "Uninstall Slack"
    uninstallSlack(input: UninstallSlackInput!): Account!
    "Disconnect GitHub Account"
    disconnectGitHubAuth(input: DisconnectGitHubAuthInput!): Account!
    "Disconnect GitLab Account"
    disconnectGitLabAuth(input: DisconnectGitLabAuthInput!): Account!
    "Disconnect Google Account"
    disconnectGoogleAuth(input: DisconnectGoogleAuthInput!): Account!
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
              teamUserQuery
                .select(1)
                .clone()
                .whereIn("userLevel", ["owner", "member"]),
            ).orWhere((qb) => {
              // User is a contributor
              qb.whereExists(
                teamUserQuery
                  .select(1)
                  .clone()
                  .where("userLevel", "contributor"),
              ).where((qb) => {
                // And is a contributor to the project
                qb.whereExists(
                  ProjectUser.query()
                    .select(1)
                    .whereRaw(`projects.id = project_users."projectId"`)
                    .where("userId", auth.user.id),
                )
                  // Or where there is a default user level set on the project
                  .orWhereNotNull("projects.defaultUserLevel");
              });
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
    consumptionRatio: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getCurrentPeriodConsumptionRatio();
    },
    currentPeriodScreenshots: async (account) => {
      const manager = account.$getSubscriptionManager();
      const screenshots = await manager.getCurrentPeriodScreenshots();
      return screenshots.all;
    },
    additionalScreenshotsCost: async (account) => {
      const manager = account.$getSubscriptionManager();
      return manager.getAdditionalScreenshotCost();
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
    hasForcedPlan: async (account) => {
      return account.forcedPlanId !== null;
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
      if (!client) {
        return null;
      }
      const namespaces = await client.Namespaces.all();
      return {
        edges: namespaces,
        pageInfo: {
          hasNextPage: false,
          totalCount: namespaces.length,
        },
      };
    },
    slackInstallation: async (account, _args, ctx) => {
      if (!account.slackInstallationId) {
        return null;
      }
      return ctx.loaders.SlackInstallation.load(account.slackInstallationId);
    },
    githubAccount: async (account, _args, ctx) => {
      if (!account.githubAccountId) {
        return null;
      }
      return ctx.loaders.GithubAccount.load(account.githubAccountId);
    },
    metrics: async (account, args) => {
      const params = {
        accountId: account.id,
        projectIds: args.input.projectIds,
        from: args.input.from,
        to: new Date(),
        groupBy: args.input.groupBy,
      };
      const [screenshots, builds] = await Promise.all([
        getAccountScreenshotMetrics(params),
        getAccountBuildMetrics(params),
      ]);
      return {
        screenshots,
        builds,
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

      if (input.meteredSpendLimitByPeriod !== undefined) {
        data.meteredSpendLimitByPeriod = input.meteredSpendLimitByPeriod;
      }

      if (
        input.blockWhenSpendLimitIsReached !== undefined &&
        input.blockWhenSpendLimitIsReached !== null
      ) {
        data.blockWhenSpendLimitIsReached = input.blockWhenSpendLimitIsReached;
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
          const gitlabClient = getGitlabClient({
            accessToken: input.gitlabAccessToken,
            baseUrl: account.gitlabBaseUrl,
          });
          try {
            const res = await gitlabClient.PersonalAccessTokens.show();
            if (!res.scopes?.includes("api")) {
              throw badUserInput(
                "The provided GitLab access token does not have the `api` scope. Please create a new one with the `api` scope.",
                {
                  code: "MISSING_GITLAB_ACCESS_TOKEN_SCOPE",
                  field: "gitlabAccessToken",
                },
              );
            }
          } catch (error: unknown) {
            if (error instanceof GitbeakerRequestError) {
              if (error.cause?.response.status === 404) {
                throw badUserInput(
                  "The provided GitLab access token does not exist.",

                  {
                    code: "GITLAB_ACCESS_TOKEN_NOT_FOUND",
                    field: "gitlabAccessToken",
                  },
                );
              }
              if (error.cause?.response.status === 401) {
                throw badUserInput(
                  "The provided GitLab access token is not valid.",
                  {
                    code: "INVALID_GITLAB_ACCESS_TOKEN",
                    field: "gitlabAccessToken",
                  },
                );
              }
            }
            throw error;
          }
        }
      }

      const previousAccount = account.$clone();
      await account.$query().patchAndFetch(data);

      // If the spend limit has been updated, we may need to notify.
      if (
        input.meteredSpendLimitByPeriod !== undefined &&
        input.meteredSpendLimitByPeriod !== null &&
        previousAccount.meteredSpendLimitByPeriod !==
          input.meteredSpendLimitByPeriod
      ) {
        await (async () => {
          const [threshold, previousThreshold] = await Promise.all([
            getSpendLimitThreshold({
              account,
              comparePreviousUsage: false,
            }),
            getSpendLimitThreshold({
              account: previousAccount,
              comparePreviousUsage: false,
            }),
          ]);

          // If there is threshold, we don't need to notify the user.
          if (!threshold) {
            return;
          }

          // If it's the same threshold, we don't need to notify the user.
          if (threshold === previousThreshold) {
            return;
          }

          const owners = await account.$getOwnerIds();
          await sendNotification({
            type: "spend_limit",
            data: {
              accountName: account.name,
              accountSlug: account.slug,
              blockWhenSpendLimitIsReached:
                account.blockWhenSpendLimitIsReached,
              threshold,
            },
            recipients: owners,
          });
        })();
      }

      return account;
    },
    uninstallSlack: async (_root, args, ctx) => {
      const { accountId } = args.input;
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
        withGraphFetched: "slackInstallation",
      });
      if (!account.slackInstallation) {
        return account;
      }
      await uninstallSlackInstallation(boltApp, account.slackInstallation);
      return account.$query();
    },
    disconnectGitHubAuth: async (_root, args, ctx) => {
      const { accountId } = args.input;
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      return disconnectGitHubAuth(account);
    },
    disconnectGitLabAuth: async (_root, args, ctx) => {
      const { accountId } = args.input;
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      return disconnectGitLabAuth(account);
    },
    disconnectGoogleAuth: async (_root, args, ctx) => {
      const { accountId } = args.input;
      const account = await getAdminAccount({
        id: accountId,
        user: ctx.auth?.user,
      });
      return disconnectGoogleAuth(account);
    },
  },
};
