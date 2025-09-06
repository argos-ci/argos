import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  Account,
  ProjectUser,
  Subscription,
  User,
  UserEmail,
} from "@/database/models/index.js";
import {
  markEmailAsVerified,
  sendVerificationEmail,
} from "@/database/services/user-email.js";
import { sendEmailTemplate } from "@/email/send-email-template.js";
import { checkErrorStatus, getTokenOctokit } from "@/github/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { deleteAccount } from "../services/account.js";
import { badUserInput, forbidden, unauthenticated } from "../util.js";
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
    "Primary email of the user"
    email: String
    "List of email addresses associated with the user"
    emails: [UserEmail!]!
  }

  type UserEmail {
    email: String!
    verified: Boolean!
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
    "Add a user email"
    addUserEmail(email: String!): User!
    "Delete a user email"
    deleteUserEmail(email: String!): User!
    "Send a verification email for a unverified email"
    sendUserEmailVerification(email: String!): User!
    "Set primary email"
    setPrimaryEmail(email: String!): User!
    "Verify email, returns true if success, false if failed"
    verifyEmail(email: String!, token: String!): Boolean!
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
    addUserEmail: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { email } = args;

      // Check if email is already in use
      const existingEmail = await UserEmail.query().findOne({ email });
      if (existingEmail) {
        if (existingEmail.userId === ctx.auth.user.id) {
          throw badUserInput("Email already added");
        }
        // If the email is verified on another account, leave it.
        if (existingEmail.verified) {
          throw badUserInput("An account already exists with this email", {
            code: "ACCOUNT_EMAIL_ALREADY_EXISTS",
          });
        }
        // If the email is not verified, then we delete it, it may not belong to the other user.
        else {
          await existingEmail.$query().delete();
        }
      }

      // Create new email entry
      await UserEmail.query().insert({
        email,
        userId: ctx.auth.user.id,
        verified: false,
      });

      await Promise.all([
        ctx.auth.user.email
          ? sendEmailTemplate({
              template: "email_added",
              data: {
                email,
                name: ctx.auth.account.displayName,
              },
              to: [ctx.auth.user.email],
            })
          : null,
        await sendVerificationEmail({ account: ctx.auth.account, email }),
      ]);

      return ctx.auth.account;
    },
    deleteUserEmail: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { email } = args;

      if (ctx.auth.user.email === email) {
        throw badUserInput("Primary email can't be deleted");
      }

      const deleted = await UserEmail.query()
        .findOne({
          email,
          userId: ctx.auth.user.id,
        })
        .delete();

      if (deleted === 1 && ctx.auth.user.email) {
        await sendEmailTemplate({
          template: "email_removed",
          data: {
            email,
            name: ctx.auth.account.displayName,
          },
          to: [ctx.auth.user.email],
        });
      }

      return ctx.auth.account;
    },
    sendUserEmailVerification: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { email } = args;

      const existingEmail = await UserEmail.query().findOne({
        email,
        userId: ctx.auth.user.id,
      });

      if (!existingEmail) {
        throw badUserInput("Email not found");
      }

      if (existingEmail.verified) {
        throw badUserInput("Email is already verified");
      }

      await sendVerificationEmail({ account: ctx.auth.account, email });

      return ctx.auth.account;
    },
    setPrimaryEmail: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const { email } = args;

      const existingEmail = await UserEmail.query().findOne({
        email,
        userId: ctx.auth.user.id,
      });

      if (!existingEmail) {
        throw badUserInput("Email not found");
      }

      if (!existingEmail.verified) {
        throw badUserInput("Email must be verified");
      }

      await User.query().patch({ email }).where("id", ctx.auth.user.id);

      return ctx.auth.account;
    },
    verifyEmail: async (_root, args) => {
      const { email, token } = args;

      const existingEmail = await UserEmail.query().findOne({
        email,
      });

      if (!existingEmail) {
        return false;
      }

      if (existingEmail.verified) {
        return false;
      }

      return markEmailAsVerified({ email, token });
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
    emails: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      const user = await ctx.loaders.User.load(account.userId);
      invariant(user, "user is undefined");
      return user.$relatedQuery("emails");
    },
  },
};
