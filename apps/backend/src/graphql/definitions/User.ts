import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { type UserPresence } from "@/auth/presence";
import { subscribeToUserPresenceChanges } from "@/auth/presenceEvents";
import { listActiveSessions } from "@/auth/session";
import { transaction } from "@/database";
import {
  Account,
  ProjectUser,
  SIGNUP_SOURCE_DETAIL_MAX_LENGTH,
  Subscription,
  TeamInvite,
  User,
  UserAccessToken,
  UserEmail,
  UserPasskey,
} from "@/database/models";
import {
  consumeAccountDeletionToken,
  sendAccountDeletedEmail,
  sendAccountDeletionRequestEmail,
} from "@/database/services/account-deletion";
import {
  enableTeamDomainAutoJoin,
  getEligibleAutoJoinDomain,
} from "@/database/services/team-domain";
import {
  markEmailAsVerified,
  sendVerificationEmail,
} from "@/database/services/user-email";
import { checkOctokitErrorStatus, getTokenOctokit } from "@/github";
import logger from "@/logger";
import { sendNotification } from "@/notification";

import {
  ISignupSource,
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

/**
 * The team id behind a slug the caller may open to email-domain auto-join.
 *
 * Taken as a slug because that is what the welcome page's URL carries, so the
 * admin check is what makes it safe — the same gate as adding a domain from the
 * team settings.
 */
async function resolveAutoJoinTeamId(args: {
  slug: string;
  user: User;
}): Promise<string> {
  // One error for every way this can fail — unknown slug, someone else's team,
  // a personal account. Distinguishing them turned the mutation into an
  // existence oracle for any account slug, which `Query.account` deliberately
  // avoids by returning null in both cases.
  const refuse = () => forbidden("You can't open this team to a domain");

  const account = await Account.query().findOne({ slug: args.slug });
  if (!account) {
    throw refuse();
  }

  const permissions = await account.$getPermissions(args.user);
  if (!permissions.includes("admin") || !account.teamId) {
    throw refuse();
  }

  return account.teamId;
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
    msTeamsWebhooks: [MsTeamsWebhook!]!
    discordWebhooks: [DiscordWebhook!]!
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
    "Passkeys the user can sign in with, most recently created first"
    passkeys: [UserPasskey!]!
    "Last activity timestamp, for presence. Null unless the viewer shares a team with the user."
    lastSeenAt: DateTime
    "IANA timezone, for rendering the user's local time. Null unless the viewer shares a team with the user."
    timezone: String
    "Team role of the user on the given project, null if not a team member"
    role(accountSlug: String!, projectName: String!): TeamUserLevel
    "Whether the account is a real person or an automated account (e.g. the Argos bot)."
    type: UserType!
    "Whether the user has staff privileges. Readable only by the user themselves — selecting it on anyone else is an error."
    staff: Boolean
    "Email domain the user can open a team to, so that anyone with a verified address on it joins automatically. Null when they have none. Readable only by the user themselves — selecting it on anyone else is an error."
    eligibleAutoJoinDomain: String
  }

  enum UserType {
    user
    bot
  }

  "Where a user found Argos, asked once on the welcome page."
  enum SignupSource {
    search_engine
    ai_assistant
    social_media
    github
    word_of_mouth
    other
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

  input CompleteWelcomeInput {
    "How the user found Argos. Null when they skipped the question."
    source: SignupSource
    "Free-text answer, only read alongside the \`other\` source."
    sourceDetail: String
    "Slug of the team to open to email-domain auto-join. Null to leave it closed. Taken as a slug rather than an id so the welcome page can act on what its URL carries, without first resolving the team."
    autoJoinTeamSlug: String
    "The domain the user was shown when they agreed. Refused if it is no longer one of their verified company domains, so the team is never opened to a domain other than the one consented to."
    autoJoinDomain: String
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
    "Record the answers given on the post-signup welcome page"
    completeWelcome(input: CompleteWelcomeInput!): User!
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
    completeWelcome: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { source, sourceDetail, autoJoinTeamSlug, autoJoinDomain } =
        args.input;

      // Checked here rather than left to the column: a `varchar(255)` overflow
      // surfaces as a Postgres error the user cannot act on.
      if (
        sourceDetail &&
        sourceDetail.trim().length > SIGNUP_SOURCE_DETAIL_MAX_LENGTH
      ) {
        throw badUserInput(
          `Keep it under ${SIGNUP_SOURCE_DETAIL_MAX_LENGTH} characters.`,
          { field: "sourceDetail" },
        );
      }

      // Resolved and authorized before the transaction opens. These are reads,
      // and the permission chain takes no `trx`, so running them inside would
      // reach for a second pooled connection while this request already holds
      // one — the hazard `resolveAccountSlug` documents.
      const autoJoinTeamId = autoJoinTeamSlug
        ? await resolveAutoJoinTeamId({
            slug: autoJoinTeamSlug,
            user: auth.user,
          })
        : null;

      // The writes go together: opening a team is a privilege grant, so it must
      // not outlive a failure of the write that records the answer. Without the
      // transaction, a patch that throws left the team open to a whole email
      // domain while the client was told the mutation failed.
      await transaction(async (trx) => {
        if (autoJoinTeamId) {
          const domain = await enableTeamDomainAutoJoin({
            userId: auth.user.id,
            teamId: autoJoinTeamId,
            expectedDomain: autoJoinDomain,
            trx,
          });
          if (!domain) {
            throw badUserInput(
              autoJoinDomain
                ? `@${autoJoinDomain} is no longer one of your verified company domains, so the team was not opened.`
                : "You need a verified email address on your organization's domain to let others join automatically.",
            );
          }
        }

        await auth.user.$query(trx).patch({
          signupSource: source ?? null,
          // The predefined sources speak for themselves, so the free-text
          // answer is only kept for `other` — and a blank one is not an answer.
          signupSourceDetail:
            source === ISignupSource.Other
              ? sourceDetail?.trim() || null
              : null,
          signupSourceAskedAt: new Date().toISOString(),
        });
      });

      return auth.account;
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
            isEmpty: result.length === 0,
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
    passkeys: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      // Which credentials protect an account is only its owner's business.
      if (ctx.auth?.user.id !== account.userId) {
        throw forbidden();
      }
      return (
        UserPasskey.query()
          .where("userId", account.userId)
          // `createdAt` is stamped in JS at millisecond precision, so two
          // passkeys registered in the same tick tie and Postgres is free to
          // return them in either order. The id breaks the tie in the same
          // direction, which keeps the list — and its visual baseline — stable.
          .orderBy([
            { column: "createdAt", order: "desc" },
            { column: "id", order: "desc" },
          ])
      );
    },
    staff: (account, _args, ctx) => {
      // Who works at Argos is not public: staff accounts hold elevated
      // permissions, so the flag is readable only by its owner. It throws
      // rather than returning null, which would be indistinguishable from a
      // genuine `false`. The field is nullable so the error stays contained:
      // it is selected in the auth bootstrap query, where nullifying `me`
      // would log the user out.
      if (!ctx.auth || ctx.auth.user.id !== account.userId) {
        throw forbidden();
      }
      return ctx.auth.user.staff;
    },
    eligibleAutoJoinDomain: async (account, _args, ctx) => {
      invariant(account.userId, "account.userId is undefined");
      // Which domains someone has verified says where they work — theirs to
      // know, nobody else's. It throws for the same reason `staff` does: a null
      // would be indistinguishable from having no eligible domain.
      if (!ctx.auth || ctx.auth.user.id !== account.userId) {
        throw forbidden();
      }
      return getEligibleAutoJoinDomain({ userId: account.userId });
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
