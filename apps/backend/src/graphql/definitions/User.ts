import gqlTag from "graphql-tag";

import {
  Account,
  ProjectUser,
  Subscription,
  User,
} from "@/database/models/index.js";
import { GhApiInstallation, getTokenOctokit } from "@/github/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { unauthenticated } from "../util.js";
import { invariant } from "@/util/invariant.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type User implements Node & Account {
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
    oldPaidSubscription: AccountSubscription
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    avatar: AccountAvatar!
    trialStatus: TrialStatus
    hasForcedPlan: Boolean!
    pendingCancelAt: DateTime
    paymentProvider: AccountSubscriptionProvider
    gitlabAccessToken: String
    glNamespaces: GlApiNamespaceConnection

    hasSubscribedToTrial: Boolean!
    lastSubscription: AccountSubscription
    teams: [Team!]!
    ghInstallations: GhApiInstallationConnection!
    projectsContributedOn(
      after: Int = 0
      first: Int = 30
      projectId: ID!
    ): ProjectContributorConnection!
  }

  type UserConnection implements Connection {
    pageInfo: PageInfo!
    edges: [User!]!
  }

  extend type Query {
    "Get the authenticated user"
    me: User
  }
`;

export const resolvers: IResolvers = {
  Query: {
    me: async (_root, _args, ctx) => {
      return ctx.auth?.account || null;
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
      if (!ctx.auth.user.accessToken) {
        return { edges: [], pageInfo: { hasNextPage: false, totalCount: 0 } };
      }
      const octokit = getTokenOctokit(ctx.auth.user.accessToken);
      const apiInstallations =
        await octokit.apps.listInstallationsForAuthenticatedUser({
          per_page: 100,
        });
      return {
        edges: apiInstallations.data.installations as GhApiInstallation[],
        pageInfo: {
          hasNextPage: false,
          totalCount: apiInstallations.data.total_count,
        },
      };
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
  },
};
