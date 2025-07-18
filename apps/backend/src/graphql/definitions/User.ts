import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  Account,
  ProjectUser,
  Subscription,
  User,
} from "@/database/models/index.js";
import { checkErrorStatus, getTokenOctokit } from "@/github/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { deleteAccount } from "../services/account.js";
import { unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node & Account {
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
    oldPaidSubscription: AccountSubscription
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    avatar: AccountAvatar!
    hasForcedPlan: Boolean!
    gitlabAccessToken: String
    gitlabBaseUrl: String
    glNamespaces: GlApiNamespaceConnection
    slackInstallation: SlackInstallation
    githubAccount: GithubAccount
    metrics(input: AccountMetricsInput!): AccountMetrics!
    meteredSpendLimitByPeriod: Int
    blockWhenSpendLimitIsReached: Boolean!

    hasSubscribedToTrial: Boolean!
    lastSubscription: AccountSubscription
    teams: [Team!]!
    ghInstallations: GhApiInstallationConnection!
    projectsContributedOn(
      after: Int = 0
      first: Int = 30
      projectId: ID!
    ): ProjectContributorConnection!
    gitlabUser: GitlabUser
    googleUser: GoogleUser
    email: String
  }

  type UserConnection implements Connection {
    pageInfo: PageInfo!
    edges: [User!]!
  }

  extend type Query {
    "Get the authenticated user"
    me: User
  }

  input DeleteUserInput {
    accountId: ID!
  }

  extend type Mutation {
    "Delete user and all its projects"
    deleteUser(input: DeleteUserInput!): Boolean!
  }
`;

export const resolvers: IResolvers = {
  Query: {
    me: async (_root, _args, ctx) => {
      return ctx.auth?.account || null;
    },
  },
  Mutation: {
    deleteUser: async (_root, args, ctx) => {
      await deleteAccount({ id: args.input.accountId, user: ctx.auth?.user });
      return true;
    },
  },
  User: {
    hasSubscribedToTrial: async (account) => {
      return account.$checkHasSubscribedToTrial();
    },
    lastSubscription: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      const subscription = await Subscription.query()
        .findOne({ subscriberId: account.userId })
        .orderBy("updatedAt");
      return subscription ?? null;
    },
    teams: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      return Account.query()
        .orderBy([
          { column: "name", order: "asc" },
          { column: "slug", order: "asc" },
        ])
        .whereIn(
          "teamId",
          User.relatedQuery("teams").select("teams.id").for(account.userId),
        );
    },
    ghInstallations: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(
        account.id === ctx.auth.account.id,
        "ghInstallations can only be accessed by the authenticated user",
      );
      if (!account.githubAccountId) {
        return { edges: [], pageInfo: { hasNextPage: false, totalCount: 0 } };
      }
      const githubAccount = await account.$relatedQuery("githubAccount");
      if (!githubAccount?.accessToken) {
        return { edges: [], pageInfo: { hasNextPage: false, totalCount: 0 } };
      }
      const octokit = getTokenOctokit({
        token: githubAccount.accessToken,
        proxy: false,
      });
      try {
        const result = await octokit.paginate(
          octokit.apps.listInstallationsForAuthenticatedUser,
        );
        return {
          edges: result,
          pageInfo: {
            hasNextPage: false,
            totalCount: result.length,
          },
        };
      } catch (error) {
        // If the token has been revoked, we should return an empty list.
        if (checkErrorStatus(401, error)) {
          return { edges: [], pageInfo: { hasNextPage: false, totalCount: 0 } };
        }

        throw error;
      }
    },
    projectsContributedOn: async (account, args, ctx) => {
      const { first, after } = args;
      if (!ctx.auth) {
        throw unauthenticated();
      }

      invariant(account.userId, "account.userId is undefined");

      const query = ProjectUser.query()
        .where("userId", account.userId)
        .orderBy("id", "desc")
        .range(after, after + first - 1);

      if (args.projectId) {
        query.where("projectId", args.projectId);
      }

      const result = await query;
      return paginateResult({ result, first, after });
    },
    gitlabUser: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      const gitlabUser = await User.relatedQuery("gitlabUser")
        .for(account.userId)
        .first();
      return gitlabUser ?? null;
    },
    googleUser: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      const gitlabUser = await User.relatedQuery("googleUser")
        .for(account.userId)
        .first();
      return gitlabUser ?? null;
    },
    email: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      const user = await ctx.loaders.User.load(account.userId);
      invariant(user, "user is undefined");
      return user.email;
    },
  },
};
