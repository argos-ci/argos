import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import config from "@/config/index.js";
import { transaction } from "@/database/index.js";
import {
  Account,
  GithubAccountMember,
  GithubInstallation,
  Team,
  TeamInvite,
  TeamUser,
  UserEmail,
} from "@/database/models/index.js";
import {
  createAccount,
  createJWTFromAccount,
} from "@/database/services/account.js";
import { createTeamAccount } from "@/database/services/team.js";
import { sendEmailTemplate } from "@/email/send-email-template.js";
import { getAppOctokit, getInstallationOctokit } from "@/github/client.js";
import {
  createArgosSubscriptionFromStripe,
  createStripeCheckoutSession,
  getCustomerIdFromUserAccount,
  getDefaultTeamPlanItems,
  getStripeProPlanOrThrow,
  getSubscriptionData,
  stripe,
} from "@/stripe/index.js";
import { getSlugFromEmail, sanitizeEmail } from "@/util/email.js";

import {
  ITeamMembersOrderBy,
  type IResolvers,
  type ITeamDefaultUserLevel,
  type ITeamUserLevel,
} from "../__generated__/resolver-types.js";
import { deleteAccount, getAdminAccount } from "../services/account.js";
import { getAccountAvatar, getAvatarColor } from "../services/avatar.js";
import {
  checkUserHasAccessToInstallation,
  getOrCreateGithubAccount,
  importOrgMembers,
} from "../services/github.js";
import { badUserInput, forbidden, notFound, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum TeamMembersOrderBy {
    DATE
    NAME_ASC
    NAME_DESC
  }

  type Team implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float!
    currentPeriodScreenshots: ScreenshotsCount!
    additionalScreenshotsCost: Float!
    includedScreenshots: Int!
    slug: String!
    name: String
    periodStartDate: DateTime
    periodEndDate: DateTime
    plan: Plan
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

    me: TeamMember
    members(
      after: Int = 0
      first: Int = 30
      "Search members by their name, slug or email"
      search: String
      "Filter members by their user level"
      levels: [TeamUserLevel!]
      "Filter members that are part of the GitHub SSO (true) or not (false). Only works when SSO is activated."
      sso: Boolean
      "Order members by"
      orderBy: TeamMembersOrderBy = DATE
    ): TeamMemberConnection!
    githubMembers(
      after: Int = 0
      first: Int = 30
      "Search members by their GitHub login"
      search: String
      "Filter members that are part of the team (true) or not (false)"
      isTeamMember: Boolean
    ): TeamGithubMemberConnection
    invites(
      after: Int = 0
      first: Int = 30
      "Search members by their email"
      search: String
    ): TeamInviteConnection
    inviteLink: String
    ssoGithubAccount: GithubAccount
    defaultUserLevel: TeamDefaultUserLevel!
    githubLightInstallation: GithubInstallation
  }

  enum TeamDefaultUserLevel {
    member
    contributor
  }

  enum TeamUserLevel {
    owner
    member
    contributor
  }

  type TeamMemberConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamMember!]!
  }

  type TeamMember implements Node {
    id: ID!
    user: User!
    level: TeamUserLevel!
    fromSSO: Boolean!
  }

  type TeamGithubMemberConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamGithubMember!]!
  }

  type TeamGithubMember implements Node {
    id: ID!
    githubAccount: GithubAccount!
    teamMember: TeamMember
  }

  type RemoveUserFromTeamPayload {
    teamMemberId: ID!
  }

  type TeamInvite implements Node {
    id: ID!
    email: String!
    team: Team!
    invitedBy: User!
    userLevel: TeamUserLevel!
    avatar: AccountAvatar!
    expired: Boolean!
  }

  type TeamInviteConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamInvite!]!
  }

  type AcceptInvitePayload {
    jwt: String
    team: Team!
  }

  input CreateTeamInput {
    name: String!
  }

  input LeaveTeamInput {
    teamAccountId: ID!
  }

  input RemoveUserFromTeamInput {
    teamAccountId: ID!
    userAccountId: ID!
  }

  input SetTeamMemberLevelInput {
    teamAccountId: ID!
    userAccountId: ID!
    level: TeamUserLevel!
  }

  input DeleteTeamInput {
    accountId: ID!
  }

  type CreateTeamResult {
    team: Team!
    redirectUrl: String!
  }

  input EnableGitHubSSOOnTeamInput {
    teamAccountId: ID!
    ghInstallationId: Int!
  }

  input DisableGitHubSSOOnTeamInput {
    teamAccountId: ID!
  }

  input SetTeamDefaultUserLevelInput {
    teamAccountId: ID!
    level: TeamDefaultUserLevel!
  }

  input ResetInviteLinkInput {
    teamAccountId: ID!
  }

  input InviteMembersInput {
    teamAccountId: ID!
    members: [InviteMemberInput!]!
  }

  input InviteMemberInput {
    email: String!
    level: TeamUserLevel!
  }

  extend type Query {
    "Get a invite (specific to a user) by its secret"
    invite(secret: String!): TeamInvite
    "Get a team invite (global to team) by its secret"
    teamInvite(secret: String!): Team
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): CreateTeamResult!
    "Leave a team"
    leaveTeam(input: LeaveTeamInput!): Boolean!
    "Remove a user from a team"
    removeUserFromTeam(
      input: RemoveUserFromTeamInput!
    ): RemoveUserFromTeamPayload!
    "Join a team (if the user has an invite)"
    joinTeam(teamAccountId: ID!): Team!
    "Accept an invite"
    acceptInvite(secret: String!): AcceptInvitePayload!
    "Accept a team invite"
    acceptTeamInvite(secret: String!): Team!
    "Set member level"
    setTeamMemberLevel(input: SetTeamMemberLevelInput!): TeamMember!
    "Delete team and all its projects"
    deleteTeam(input: DeleteTeamInput!): Boolean!
    "Enable GitHub SSO"
    enableGitHubSSOOnTeam(input: EnableGitHubSSOOnTeamInput!): Team!
    "Disable GitHub SSO"
    disableGitHubSSOOnTeam(input: DisableGitHubSSOOnTeamInput!): Team!
    "Set team default user level"
    setTeamDefaultUserLevel(input: SetTeamDefaultUserLevelInput!): Team!
    "Reset invite link"
    resetInviteLink(input: ResetInviteLinkInput!): Team!
    "Invite members to a team"
    inviteMembers(input: InviteMembersInput!): [TeamInvite!]!
    "Cancel a team invite"
    cancelInvite(teamInviteId: ID!): Team!
  }
`;

export const resolvers: IResolvers = {
  TeamGithubMember: {
    githubAccount: async (githubAccountMember, _args, ctx) => {
      const githubAccount = await ctx.loaders.GithubAccount.load(
        githubAccountMember.githubMemberId,
      );
      invariant(githubAccount, "GitHub account not found");
      return githubAccount;
    },
    teamMember: async (githubAccountMember, _args, ctx) => {
      return ctx.loaders.TeamUserFromGithubMember.load(githubAccountMember);
    },
  },
  TeamMember: {
    user: async (teamUser, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: teamUser.userId,
      });
      invariant(account, "account not found");
      return account;
    },
    level: (teamUser) => teamUser.userLevel as ITeamUserLevel,
    fromSSO: async (teamUser, _args, ctx) => {
      const [team, userAccount] = await Promise.all([
        ctx.loaders.Team.load(teamUser.teamId),
        ctx.loaders.AccountFromRelation.load({
          userId: teamUser.userId,
        }),
      ]);

      invariant(team, "team not found");
      invariant(userAccount, "user account not found");

      if (!team.ssoGithubAccountId || !userAccount.githubAccountId) {
        return false;
      }

      const githubTeamUser = await ctx.loaders.GitHubAccountMemberLoader.load({
        githubAccountId: team.ssoGithubAccountId,
        githubMemberId: userAccount.githubAccountId,
      });

      return Boolean(githubTeamUser);
    },
  },
  Team: {
    me: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");

      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamUser = await TeamUser.query()
        .where("teamId", account.teamId)
        .where("userId", ctx.auth.user.id)
        .first();

      if (!teamUser) {
        invariant(
          ctx.auth.user.staff,
          "user is not staff and teamUser is undefined",
        );
        return null;
      }

      return teamUser;
    },
    members: async (account, args, ctx) => {
      invariant(account.teamId, "not a team account");

      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { first, after, levels, search } = args;

      const team = await ctx.loaders.Team.load(account.teamId);

      invariant(team, "team not found");

      const hasGithubSSO = Boolean(team.ssoGithubAccountId);

      const orderBy = args.orderBy ?? ITeamMembersOrderBy.Date;

      const query = TeamUser.query()
        .withGraphJoined("user.account")
        .where("team_users.teamId", account.teamId)
        .range(after, after + first - 1);

      switch (orderBy) {
        case ITeamMembersOrderBy.Date:
          query.orderBy("team_users.id", "DESC");
          break;
        case ITeamMembersOrderBy.NameAsc:
          query
            .orderBy("user:account.name", "ASC")
            .orderBy("user:account.slug", "ASC");
          break;
        case ITeamMembersOrderBy.NameDesc:
          query
            .orderBy("user:account.name", "DESC")
            .orderBy("user:account.slug", "DESC");
          break;
      }

      if (levels && levels.length > 0) {
        query.whereIn("team_users.userLevel", levels);
      }

      if (search) {
        query.where((qb) => {
          qb.where("user:account.name", "ilike", `%${search}%`)
            .orWhere("user:account.slug", "ilike", `%${search}%`)
            .orWhere("user.email", "ilike", `%${search}%`);
        });
      }

      // If SSO is activated, exclude SSO members.
      if (hasGithubSSO && typeof args.sso === "boolean") {
        if (args.sso) {
          query
            .withGraphJoined("user.account")
            .whereIn(
              "user:account.githubAccountId",
              GithubAccountMember.query()
                .select("githubMemberId")
                .where("githubAccountId", team.ssoGithubAccountId),
            );
        } else {
          query
            .withGraphJoined("user.account")
            .whereNotIn(
              "user:account.githubAccountId",
              GithubAccountMember.query()
                .select("githubMemberId")
                .where("githubAccountId", team.ssoGithubAccountId),
            );
        }
      }

      const result = await query;

      return paginateResult({ result, first, after });
    },
    githubMembers: async (account, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { first, after, search } = args;

      invariant(account.teamId);

      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      if (!team.ssoGithubAccountId) {
        return null;
      }

      const query = GithubAccountMember.query()
        .withGraphJoined("githubMember")
        .where(
          "github_account_members.githubAccountId",
          team.ssoGithubAccountId,
        )
        .orderBy("githubMember.login", "asc")
        .range(after, after + first - 1);

      if (search) {
        query.where("githubMember.login", "ilike", `%${search}%`);
      }

      if (typeof args.isTeamMember === "boolean") {
        if (args.isTeamMember) {
          query
            .withGraphJoined("githubMember.account")
            .whereIn(
              "githubMember:account.userId",
              TeamUser.query().select("userId").where("teamId", team.id),
            );
        } else {
          query
            .withGraphJoined("githubMember.account", {
              joinOperation: "leftJoin",
            })
            .where((qb) => {
              qb.whereNull("githubMember:account.userId").orWhereNotIn(
                "githubMember:account.userId",
                TeamUser.query().select("userId").where("teamId", team.id),
              );
            });
        }
      }

      const result = await query;

      return paginateResult({ result, first, after });
    },
    inviteLink: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      invariant(account.teamId);
      const [team, permissions] = await Promise.all([
        ctx.loaders.Team.load(account.teamId),
        Team.getPermissions(account.teamId, ctx.auth.user),
      ]);

      if (!permissions.includes("admin")) {
        return null;
      }

      invariant(team);
      const inviteLink = await team.$getInviteLink();
      return inviteLink;
    },
    ssoGithubAccount: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(account.teamId);
      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      if (!team.ssoGithubAccountId) {
        return null;
      }

      return ctx.loaders.GithubAccount.load(team.ssoGithubAccountId);
    },
    defaultUserLevel: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(account.teamId);
      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      return team.defaultUserLevel as ITeamDefaultUserLevel;
    },
    githubLightInstallation: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      if (!account.githubLightInstallationId) {
        return null;
      }

      const installation = await ctx.loaders.GithubInstallation.load(
        account.githubLightInstallationId,
      );
      invariant(installation);
      if (installation.deleted) {
        return null;
      }
      return installation;
    },
    invites: async (account, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      invariant(account.teamId);
      const permissions = await Team.getPermissions(
        account.teamId,
        ctx.auth.user,
      );

      if (!permissions.includes("admin")) {
        return null;
      }

      const { first, after, search } = args;

      const query = TeamInvite.query()
        .where("teamId", account.teamId)
        .orderBy("createdAt", "desc")
        .range(after, after + first - 1);

      if (search) {
        query.where("email", "ilike", `%${search}%`);
      }

      const result = await query;
      return paginateResult({ result, first, after });
    },
  },
  TeamInvite: {
    id: (teamInvite) => TeamInvite.formatId(teamInvite),
    team: async (teamInvite, _args, ctx) => {
      const teamAccount = await ctx.loaders.AccountFromRelation.load({
        teamId: teamInvite.teamId,
      });
      invariant(teamAccount, "team account not found");
      return teamAccount;
    },
    invitedBy: async (teamInvite, _args, ctx) => {
      const invitedByAccount = await ctx.loaders.AccountFromRelation.load({
        userId: teamInvite.invitedById,
      });
      invariant(invitedByAccount, "invited by account not found");
      return invitedByAccount;
    },
    avatar: (teamInvite) => {
      const firstEmailLetter = teamInvite.email.charAt(0);
      invariant(firstEmailLetter);
      return {
        url: () => null,
        initial: firstEmailLetter.toUpperCase(),
        color: getAvatarColor(teamInvite.email),
      };
    },
    expired: (teamInvite) => {
      return new Date(teamInvite.expiresAt) < new Date();
    },
  },
  Query: {
    teamInvite: async (_root, args) => {
      const team = await Team.query()
        .withGraphFetched("account")
        .findOne({ inviteSecret: args.secret });

      if (team) {
        invariant(team.account, "Team account not loaded");
        return team.account;
      }

      return null;
    },
    invite: async (_root, args) => {
      const teamInvite = await TeamInvite.query()
        .where("secret", args.secret)
        .whereRaw(`"expiresAt" > now()`)
        .first();

      return teamInvite ?? null;
    },
  },
  Mutation: {
    createTeam: async (_root, args, ctx) => {
      const { auth } = ctx;

      if (!auth) {
        throw unauthenticated();
      }

      const teamAccount = await createTeamAccount({
        name: args.input.name,
        ownerId: auth.user.id,
      });

      const [hasSubscribedToTrial, plan] = await Promise.all([
        auth.account.$checkHasSubscribedToTrial(),
        getStripeProPlanOrThrow(),
      ]);

      const teamUrl = new URL(`/${teamAccount.slug}`, config.get("server.url"))
        .href;

      const redirectToStripe = async ({ trial }: { trial: boolean }) => {
        const session = await createStripeCheckoutSession({
          teamAccount,
          plan,
          subscriberAccount: auth.account,
          trial,
          successUrl: teamUrl,
          cancelUrl: `${teamUrl}?checkout=cancel`,
        });

        invariant(session.url, "session.url missing");

        return { team: teamAccount, redirectUrl: session.url };
      };

      // If the user has already subscribed to a trial, we will redirect to the checkout page
      if (hasSubscribedToTrial) {
        return redirectToStripe({ trial: false });
      }

      // Else we will try to setup trial server-side

      // Try to get or create a Stripe customer for the user
      const stripeCustomerId = await getCustomerIdFromUserAccount(auth.account);

      // If we failed to create a customer (no email), we will redirect to checkout page
      if (!stripeCustomerId) {
        return redirectToStripe({ trial: true });
      }

      // Register the Stripe customer id to the team account
      await teamAccount.$query().patchAndFetch({ stripeCustomerId });

      const items = await getDefaultTeamPlanItems(plan);

      // Create a Stripe subscription for the user
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items,
        ...getSubscriptionData({
          trial: true,
          accountId: teamAccount.id,
          subscriberId: auth.user.id,
        }),
      });

      await createArgosSubscriptionFromStripe({
        stripeSubscription,
        account: teamAccount,
        subscriberId: auth.user.id,
      });

      return {
        team: teamAccount,
        redirectUrl: teamUrl,
      };
    },
    leaveTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const account = await Account.query()
        .findById(args.input.teamAccountId)
        .throwIfNotFound();

      const count = await TeamUser.query()
        .where({ teamId: account.teamId })
        .resultSize();

      if (count === 1) {
        throw forbidden(
          "You are the last user of this team, you can't leave it",
        );
      }

      await transaction(async (trx) => {
        if (!ctx.auth) {
          throw unauthenticated();
        }

        await TeamUser.query(trx).delete().where({
          userId: ctx.auth.user.id,
          teamId: account.teamId,
        });

        // The last one is the only one, so it must be the owner
        if (count === 2) {
          await TeamUser.query(trx)
            .where({ teamId: account.teamId })
            .patch({ userLevel: "owner" });
        }
      });

      return true;
    },
    removeUserFromTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [teamAccount, userAccount] = await Promise.all([
        getAdminAccount({
          id: args.input.teamAccountId,
          user: ctx.auth.user,
        }),
        Account.query().findById(args.input.userAccountId).throwIfNotFound(),
      ]);

      const count = await TeamUser.query()
        .where({ teamId: teamAccount.teamId })
        .resultSize();

      if (count === 1) {
        throw forbidden("Can't remove the last user of a team.");
      }

      const teamUser = await TeamUser.query()
        .select("id")
        .findOne({
          teamId: teamAccount.teamId,
          userId: userAccount.userId,
        })
        .throwIfNotFound();

      await transaction(async (trx) => {
        if (!ctx.auth) {
          throw unauthenticated();
        }

        const teamUser = await TeamUser.query(trx)
          .select("id")
          .findOne({
            teamId: teamAccount.teamId,
            userId: userAccount.userId,
          })
          .throwIfNotFound();

        await teamUser.$query(trx).delete();

        // The last one is the only one, so it must be the owner
        if (count === 2) {
          await TeamUser.query(trx)
            .where({ teamId: teamAccount.teamId })
            .patch({ userLevel: "owner" });
        }
      });

      return {
        teamMemberId: teamUser.id,
      };
    },
    acceptTeamInvite: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const team = await Team.query()
        .withGraphFetched("account")
        .findOne({ inviteSecret: args.secret });

      invariant(team, "Invalid invite secret");
      invariant(team.account, "Team account not loaded");

      const teamUser = await TeamUser.query().findOne({
        teamId: team.id,
        userId: auth.user.id,
      });

      if (teamUser) {
        return team.account;
      }

      await transaction(async (trx) => {
        await Promise.all([
          // Add the user to the team.
          TeamUser.query(trx).insert({
            userId: auth.user.id,
            teamId: team.id,
            userLevel: team.defaultUserLevel,
          }),
          // Delete all invites for this user email.
          TeamInvite.query(trx)
            .where("teamId", team.id)
            .whereIn(
              "email",
              UserEmail.query()
                .select("email")
                .where("userId", auth.user.id)
                .where("verified", true),
            ),
        ]);
      });

      return team.account;
    },
    acceptInvite: async (_root, args, ctx) => {
      const teamInvite = await TeamInvite.query()
        .where("secret", args.secret)
        .whereRaw(`"expiresAt" > now()`)
        .withGraphFetched("team.account")
        .first();

      if (!teamInvite) {
        throw notFound("Invitation not found or expired");
      }

      const { team } = teamInvite;
      invariant(team, "Team relation not loaded");
      const teamAccount = team.account;
      invariant(teamAccount, "Account relation not loaded");
      const email = sanitizeEmail(teamInvite.email);

      const { auth } = ctx;

      if (!auth) {
        // Get or create the user account based on the email of the invite.
        const { account, user } = await (async () => {
          const userEmail = await UserEmail.query()
            .where("email", email)
            .withGraphFetched("user.account")
            .first();
          if (userEmail) {
            invariant(userEmail.user?.account, "Account relation not loaded");
            return {
              account: userEmail.user.account,
              user: userEmail.user,
            };
          }
          const slug = getSlugFromEmail(teamInvite.email);
          const { account, user } = await createAccount({ email, slug });
          return { account, user };
        })();

        // Add user to the team and delete the invite in a transaction.
        await transaction(async (trx) => {
          await Promise.all([
            // Add the user to the team.
            TeamUser.query(trx)
              .insert({
                userId: user.id,
                teamId: team.id,
                userLevel: teamInvite.userLevel,
              })
              .onConflict()
              .ignore(),
            // Delete the invite.
            teamInvite.$query(trx).delete(),
          ]);
        });

        const jwt = createJWTFromAccount(account);
        return { jwt, team: teamAccount };
      }

      // If the user is logged in:
      // - Add the user to the team
      // - Add the email to the user if not already present
      // - Delete the invite
      await transaction(async (trx) => {
        await Promise.all([
          // Add the user to the team.
          TeamUser.query(trx)
            .insert({
              userId: auth.user.id,
              teamId: team.id,
              userLevel: teamInvite.userLevel,
            })
            .onConflict()
            .ignore(),
          // Add the email to the user if not already present.
          UserEmail.query(trx)
            .insert({
              email,
              verified: true,
              userId: auth.user.id,
            })
            .onConflict()
            .ignore(),
          // Delete the invite.
          teamInvite.$query(trx).delete(),
        ]);
      });

      return { jwt: null, team: teamAccount };
    },
    joinTeam: async (_root, args, ctx) => {
      const { auth } = ctx;

      if (!auth) {
        throw unauthenticated();
      }

      const teamAccount = await Account.query()
        .findById(args.teamAccountId)
        .throwIfNotFound();

      const { teamId } = teamAccount;
      invariant(teamId, "Account is not a team");

      const teamInvite = await TeamInvite.query()
        .whereRaw(`"expiresAt" > now()`)
        .where("teamId", teamId)
        .whereIn(
          "email",
          UserEmail.query()
            .select("email")
            .where("userId", auth.user.id)
            .where("verified", true),
        )
        .first();

      if (!teamInvite) {
        throw badUserInput("You don't have an invite for this team");
      }

      await transaction(async (trx) => {
        await Promise.all([
          // Add the user to the team.
          TeamUser.query(trx)
            .insert({
              userId: auth.user.id,
              teamId: teamId,
              userLevel: teamInvite.userLevel,
            })
            .onConflict()
            .ignore(),
          // Delete the invite.
          teamInvite.$query(trx).delete(),
        ]);
      });

      return teamAccount;
    },
    setTeamMemberLevel: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [teamAccount, userAccount] = await Promise.all([
        getAdminAccount({
          id: args.input.teamAccountId,
          user: ctx.auth.user,
        }),
        Account.query().findById(args.input.userAccountId).throwIfNotFound(),
      ]);

      const teamUser = await TeamUser.query()
        .findOne({
          userId: userAccount.userId,
          teamId: teamAccount.teamId,
        })
        .throwIfNotFound();

      if (teamUser.userLevel === args.input.level) {
        return teamUser;
      }

      return teamUser.$query().patchAndFetch({
        userLevel: args.input.level,
      });
    },
    deleteTeam: async (_root, args, ctx) => {
      await deleteAccount({ id: args.input.accountId, user: ctx.auth?.user });
      return true;
    },
    enableGitHubSSOOnTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const [installation, hasAccessToInstallation, teamAccount] =
        await Promise.all([
          GithubInstallation.query()
            .findOne("githubId", args.input.ghInstallationId)
            .where("deleted", false)
            .throwIfNotFound(),
          checkUserHasAccessToInstallation(
            ctx.auth.account,
            args.input.ghInstallationId,
          ),
          getAdminAccount({
            id: args.input.teamAccountId,
            user: ctx.auth.user,
            withGraphFetched: "githubLightInstallation",
          }),
        ]);

      if (!hasAccessToInstallation) {
        throw forbidden("User does not have access to GitHub installation");
      }

      const app =
        teamAccount.githubLightInstallation &&
        !teamAccount.githubLightInstallation.deleted
          ? "light"
          : "main";

      const appOctokit = getAppOctokit({ app, proxy: installation.proxy });

      const ghInstallation = await appOctokit.apps.getInstallation({
        installation_id: installation.githubId,
      });
      const ghOrg = ghInstallation.data.account;
      invariant(ghOrg, "GitHub Organization not found");
      invariant("type" in ghOrg, "GitHub enterprise not supported");

      const githubAccount = await getOrCreateGithubAccount(ghOrg);
      invariant(githubAccount, "GitHub account not found");

      const octokit = await getInstallationOctokit(installation, appOctokit);
      invariant(octokit, "Invalid installation");

      const { teamId } = teamAccount;
      invariant(teamId, "Account teamId is undefined");

      const newTeamUserInputs = await importOrgMembers({
        octokit,
        org: ghOrg.login,
        teamId,
        githubAccount,
      });

      const manager = teamAccount.$getSubscriptionManager();
      const [plan, subscriptionStatus, subscription] = await Promise.all([
        manager.getPlan(),
        manager.getSubscriptionStatus(),
        manager.getActiveSubscription(),
      ]);

      if (subscriptionStatus !== "active") {
        throw forbidden("A valid subscription is required to enable SSO");
      }

      const priced = !plan?.githubSsoIncluded;

      if (priced) {
        if (!subscription) {
          throw forbidden("A valid subscription is required to enable SSO");
        }

        if (!subscription.stripeSubscriptionId) {
          throw forbidden("GitHub SSO is not available on your current plan");
        }

        const [stripeSubscription, stripeProduct] = await Promise.all([
          stripe.subscriptions.retrieve(subscription.stripeSubscriptionId),
          stripe.products.retrieve(config.get("stripe.githubSSOProductId")),
        ]);

        invariant(
          stripeSubscription,
          `Subscription ${subscription.stripeSubscriptionId} not found`,
        );
        invariant(
          stripeProduct,
          `Product ${config.get("stripe.githubSSOProductId")} not found`,
        );
        invariant(
          typeof stripeProduct.default_price === "string",
          "Product default_price is undefined",
        );

        const alreadyBought = stripeSubscription.items.data.some(
          (item) => item.price.product === stripeProduct.id,
        );

        // If the user has not already bought the SSO product, we will add it to the subscription
        if (!alreadyBought) {
          await stripe.subscriptionItems.create({
            subscription: subscription.stripeSubscriptionId,
            price: stripeProduct.default_price,
          });
        }
      }

      // Enable SSO and add members in a transaction
      await transaction(async (trx) => {
        await Promise.all([
          Team.query(trx).findById(teamId).patch({
            ssoGithubAccountId: githubAccount.id,
          }),
          newTeamUserInputs.length > 0
            ? TeamUser.query(trx).insert(newTeamUserInputs)
            : null,
        ]);
      });

      return teamAccount;
    },
    disableGitHubSSOOnTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: ctx.auth.user,
      });

      invariant(teamAccount.teamId, "Account teamId is undefined");

      const manager = teamAccount.$getSubscriptionManager();
      const subscription = await manager.getActiveSubscription();

      if (subscription?.stripeSubscriptionId) {
        const [stripeSubscription, stripeProduct] = await Promise.all([
          stripe.subscriptions.retrieve(subscription.stripeSubscriptionId),
          stripe.products.retrieve(config.get("stripe.githubSSOProductId")),
        ]);

        invariant(
          stripeSubscription,
          `Subscription ${subscription.stripeSubscriptionId} not found`,
        );

        invariant(
          stripeProduct,
          `Product ${config.get("stripe.githubSSOProductId")} not found`,
        );

        const item = stripeSubscription.items.data.find(
          (item) => item.price.product === stripeProduct.id,
        );

        // If the user has bought the SSO product, we will remove it from the subscription
        if (item) {
          await stripe.subscriptionItems.del(item.id);
        }
      }

      await Team.query().findById(teamAccount.teamId).patch({
        ssoGithubAccountId: null,
      });

      return teamAccount;
    },
    setTeamDefaultUserLevel: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: ctx.auth.user,
      });

      invariant(teamAccount.teamId, "Account teamId is undefined");

      await Team.query().findById(teamAccount.teamId).patch({
        defaultUserLevel: args.input.level,
      });

      return teamAccount;
    },
    resetInviteLink: async (_root, args, ctx) => {
      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: ctx.auth?.user,
      });

      invariant(teamAccount.teamId, "Account teamId is undefined");

      await Team.query().findById(teamAccount.teamId).patch({
        inviteSecret: Team.generateInviteSecret(),
      });

      return teamAccount;
    },
    inviteMembers: async (_root, args, ctx) => {
      const { auth } = ctx;

      if (!auth) {
        throw unauthenticated();
      }

      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: auth?.user,
      });

      const { teamId } = teamAccount;
      invariant(teamId, "Account teamId is undefined");

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      const data = args.input.members.map((member) => ({
        secret: TeamInvite.generateSecret(),
        email: sanitizeEmail(member.email),
        teamId,
        userLevel: member.level,
        expiresAt: expiresAt.toISOString(),
        invitedById: auth.user.id,
      }));

      const userEmails = await UserEmail.query()
        .whereIn(
          "user_emails.email",
          data.map((d) => d.email),
        )
        .withGraphJoined("user.[teams,account]");

      const usersInTeam = userEmails.filter((ue) => {
        invariant(ue.user?.teams, "relation not fetched");
        return ue.user.teams.some((tu) => tu.id === teamId);
      });

      if (usersInTeam.length > 0) {
        const fields = usersInTeam.map((user) => {
          const index = data.findIndex((d) => d.email === user.email);
          return `members.${index}.email`;
        });
        throw badUserInput("User already in the team", {
          field: fields,
        });
      }

      const invites = await TeamInvite.query()
        .insertAndFetch(data)
        .onConflict(["email", "teamId"])
        .merge();

      await Promise.all(
        invites.map(async (invite) => {
          const user = userEmails.find((ue) => ue.email === invite.email)?.user;

          const [teamAvatar, avatar] = await Promise.all([
            getAccountAvatar(teamAccount, ctx.loaders),
            user?.account ? getAccountAvatar(user.account, ctx.loaders) : null,
          ]);

          const [teamAvatarURL, avatarURL] = await Promise.all([
            teamAvatar.url({ size: 128 }),
            avatar?.url({ size: 128 }) ?? null,
          ]);

          const firstEmailLetter = invite.email[0]?.toUpperCase();
          invariant(firstEmailLetter, "Email is empty");

          await sendEmailTemplate({
            template: "team_invite",
            to: [invite.email],
            data: {
              email: invite.email,
              userLevel: invite.userLevel,
              avatar: avatar
                ? {
                    url: avatarURL,
                    initial: avatar.initial,
                    color: avatar.color,
                  }
                : {
                    url: null,
                    initial: firstEmailLetter.toUpperCase(),
                    color: getAvatarColor(invite.email),
                  },
              invite: {
                url: new URL(
                  `/invites/${invite.secret}`,
                  config.get("server.url"),
                ).href,
                date: new Date(invite.createdAt),
              },
              team: {
                name: teamAccount.displayName,
                avatar: {
                  url: teamAvatarURL,
                  initial: teamAvatar.initial,
                  color: teamAvatar.color,
                },
              },
              invitedBy: {
                name: auth.account.displayName,
                email: auth.user.email,
                location: ctx.requestLocation,
              },
            },
          });
        }),
      );

      return invites;
    },
    cancelInvite: async (_root, args, ctx) => {
      const parsedId = TeamInvite.parseId(args.teamInviteId);
      if (!parsedId) {
        throw notFound("Team invite not found");
      }
      // Fetch the team invite and ensure the user has admin access to the team in parallel.
      const [teamInvite, teamAccount] = await Promise.all([
        TeamInvite.query().findOne(parsedId),
        // Ensure the user has admin access to the team.
        getAdminAccount({
          id: parsedId.teamId,
          user: ctx.auth?.user,
        }),
      ]);
      if (!teamInvite) {
        throw notFound("Team invite not found");
      }
      await teamInvite.$query().delete();
      return teamAccount;
    },
  },
};
