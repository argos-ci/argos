import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { type UserPresence } from "@/auth/presence";
import { subscribeToUserPresenceChanges } from "@/auth/presenceEvents";
import { listActiveSessions } from "@/auth/session";
import {
  Account,
  ProjectUser,
  Subscription,
  TeamInvite,
  User,
  UserAccessToken,
  UserEmail,
} from "@/database/models";
import {
  consumeAccountDeletionToken,
  sendAccountDeletedEmail,
  sendAccountDeletionRequestEmail,
} from "@/database/services/account-deletion";
import {
  markEmailAsVerified,
  sendVerificationEmail,
} from "@/database/services/user-email";
import { checkOctokitErrorStatus, getTokenOctokit } from "@/github";
import logger from "@/logger";
import { sendNotification } from "@/notification";

import {
  type IResolvers,
  type ITeamUserLevel,
  type IUserType,
} from "../__generated__/resolver-types";
import type { Context } from "../context";
import { deleteAccount, getAdminAccount } from "../services/account";
import { assertCanViewUserPresence } from "../services/user-presence";
import { badUserInput, forbidden, unauthenticated } from "../util";
import { commonAccountResolvers } from "./Account";
import { paginateResult } from "./PageInfo";

const { gql } = gqlTag;

/**
 * Load a user's presence, but only if the viewer is allowed to see it (the user
 * themselves or a shared-team member). Returns `null` otherwise. Both the
 * visibility check and the presence read are batched via the request loaders.
 */
async function loadVisiblePresence(
  ctx: Context,
  targetUserId: string,
): Promise<UserPresence | null> {
  const viewerId = ctx.auth?.user.id;
  if (!viewerId) {
    return null;
  }
  const canView = await ctx.loaders.UsersShareTeam.load({
    aUserId: viewerId,
    bUserId: targetUserId,
  });
  if (!canView) {
    return null;
  }
  return ctx.loaders.Presence.load(targetUserId);
}

export const typeDefs = gql`
  type User implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float!
    currentPeriodScreenshots: ScreenshotsCount!
    additionalScreenshotsCost: Float!
    includedScreenshots: Int!
    slug: String!
    name: String
    plan: Plan
    periodStartDate: DateTime
    periodEndDate: DateTime
    subscription: AccountSubscription
    subscriptionStatus: AccountSubscriptionStatus
    canExtendTrial: Boolean!
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    tests(
      after: Int = 0
      first: Int = 30
      period: MetricsPeriod!
      filters: TestsFilterInput
    ): TestConnection!
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
    invites: [TeamInvite!]!
    "The GitHub app installations accessible to the user. Null when the user has no usable GitHub connection (never linked, or the token has expired or been revoked)."
    ghInstallations: GhApiInstallationConnection
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
    "List of personal access tokens for the user"
    userAccessTokens: [UserAccessToken!]!
    "List of active login sessions for the user, most recently seen first"
    sessions: [UserSession!]!
    "Last activity timestamp, for presence. Null unless the viewer shares a team with the user."
    lastSeenAt: DateTime
    "IANA timezone, for rendering the user's local time. Null unless the viewer shares a team with the user."
    timezone: String
    "Team role of the user on the given project, null if not a team member"
    role(accountSlug: String!, projectName: String!): TeamUserLevel
    "Whether the account is a real person or an automated account (e.g. the Argos bot)."
    type: UserType!
  }

  enum UserType {
    user
    bot
  }

  type UserPresenceChangeEvent {
    user: User!
  }

  extend type Subscription {
    "Emitted when the given user becomes active again."
    userPresenceChanged(userId: ID!): UserPresenceChangeEvent!
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

  input RequestAccountDeletionInput {
    accountId: ID!
  }

  input ConfirmAccountDeletionInput {
    token: String!
  }

  extend type Mutation {
    "Request the deletion of a user account. Sends a confirmation email."
    requestAccountDeletion(input: RequestAccountDeletionInput!): Boolean!
    "Confirm the deletion of a user account using the token from the email."
    confirmAccountDeletion(input: ConfirmAccountDeletionInput!): Boolean!
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
    requestAccountDeletion: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const account = await getAdminAccount({
        id: args.input.accountId,
        user: ctx.auth.user,
      });
      if (account.type !== "user") {
        throw badUserInput(
          "Account deletion request is only available for user accounts",
        );
      }
      // The user MUST be the account owner — guard against admins (e.g. staff)
      // triggering deletion emails for another user's account.
      if (account.userId !== ctx.auth.user.id) {
        throw forbidden();
      }
      const email = ctx.auth.user.email;
      if (!email) {
        throw badUserInput(
          "Your account has no primary email — cannot send confirmation",
        );
      }
      await sendAccountDeletionRequestEmail({ account, email });
      return true;
    },
    confirmAccountDeletion: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const { account, user } = ctx.auth;
      // The token must belong to the authenticated user's account.
      // We check the auth account is a user account *and* matches the auth user
      // before consuming, to prevent token enumeration against other accounts.
      if (account.type !== "user" || account.userId !== user.id) {
        throw forbidden();
      }
      const valid = await consumeAccountDeletionToken({
        token: args.input.token,
        accountId: account.id,
      });
      if (!valid) {
        throw badUserInput(
          "The confirmation link has expired or is invalid. Please request a new account deletion from your personal settings.",
          { code: "ACCOUNT_DELETION_TOKEN_INVALID" },
        );
      }
      // Capture the email *before* deletion — afterwards the user is nulled.
      const email = user.email;
      const displayName = account.displayName;
      await deleteAccount({ id: account.id, user });
      if (email) {
        try {
          await sendAccountDeletedEmail({ name: displayName, email });
        } catch (error) {
          logger.error({ error }, "Fail to send account deletion email");
        }
      }
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
        sendNotification({
          type: "email_added",
          data: { email },
          recipients: [ctx.auth.user.id],
        }),
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

      if (deleted === 1) {
        await sendNotification({
          type: "email_removed",
          data: { email },
          recipients: [ctx.auth.user.id],
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
    ...commonAccountResolvers,
    role: async (account, args, ctx) => {
      if (!account.userId) {
        return null;
      }
      const level = await ctx.loaders.ProjectTeamUserLevel.load({
        accountSlug: args.accountSlug,
        projectName: args.projectName,
        userId: account.userId,
      });
      return (level as ITeamUserLevel) ?? null;
    },
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
    invites: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      return TeamInvite.query()
        .whereRaw(`"expiresAt" > now()`)
        .whereIn(
          "email",
          UserEmail.query()
            .select("email")
            .where("userId", account.userId)
            .where("verified", true),
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
      // Return `null` when there is no usable GitHub connection so the client
      // can tell "the token is invalid, ask the user to (re)connect" apart from
      // "the token is valid but no app is installed".
      if (!account.githubAccountId) {
        return null;
      }
      const githubAccount = await account.$relatedQuery("githubAccount");
      if (!githubAccount?.accessToken) {
        return null;
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
        // If the token has been revoked, the connection is no longer usable.
        if (checkOctokitErrorStatus(401, error)) {
          return null;
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
    userAccessTokens: async (account) => {
      invariant(account.userId, "account.userId is undefined");
      return UserAccessToken.query()
        .where("userId", account.userId)
        .withGraphFetched("scope.account")
        .orderBy("createdAt", "desc");
    },
    sessions: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      // Sessions are sensitive — only the owner may list them.
      if (ctx.auth?.user.id !== account.userId) {
        throw forbidden();
      }
      return listActiveSessions(account.userId);
    },
    lastSeenAt: async (account, _args, ctx) => {
      if (!account.userId) {
        return null;
      }
      const presence = await loadVisiblePresence(ctx, account.userId);
      return presence ? new Date(presence.lastSeenAt) : null;
    },
    timezone: async (account, _args, ctx) => {
      if (!account.userId) {
        return null;
      }
      const presence = await loadVisiblePresence(ctx, account.userId);
      return presence?.timezone ?? null;
    },
    type: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      const user = await ctx.loaders.User.load(account.userId);
      invariant(user, "user is undefined");
      return user.type as IUserType;
    },
  },
  Subscription: {
    userPresenceChanged: {
      // Authorize before opening the stream so an unpermitted subscription is
      // rejected upfront rather than after the first event.
      subscribe: async (_root, args, ctx) => {
        await assertCanViewUserPresence(args.userId, ctx.auth?.user ?? null);
        return (async function* () {
          for await (const change of subscribeToUserPresenceChanges(
            args.userId,
          )) {
            const account = await Account.query().findOne({
              userId: change.userId,
            });
            if (account) {
              yield { userPresenceChanged: { user: account } };
            }
          }
        })();
      },
    },
  },
};
