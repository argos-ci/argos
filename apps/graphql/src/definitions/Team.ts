import { GraphQLError } from "graphql";
import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import { transaction } from "@argos-ci/database";
import { Account, Team, TeamUser } from "@argos-ci/database/models";
import { createTeamAccount } from "@argos-ci/database/services/team";
import {
  createPurchaseFromSubscription,
  createStripeCheckoutSession,
  getOrCreateUserCustomerId,
  getStripePriceFromPlanOrThrow,
  getStripeProPlanOrThrow,
  getTrialSubscriptionConfig,
  stripe,
} from "@argos-ci/stripe";

import type {
  IResolvers,
  ITeamUserLevel,
} from "../__generated__/resolver-types.js";
import { deleteAccount, getWritableAccount } from "../services/account.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Team implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    hasPaidPlan: Boolean!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    periodStartDate: DateTime
    periodEndDate: DateTime
    plan: Plan
    purchase: Purchase
    purchaseStatus: PurchaseStatus
    oldPaidPurchase: Purchase
    permissions: [Permission!]!
    projects(after: Int!, first: Int!): ProjectConnection!
    ghAccount: GithubAccount
    avatar: AccountAvatar!
    members(after: Int = 0, first: Int = 30): TeamMemberConnection!
    me: TeamMember!
    inviteLink: String!
    trialStatus: TrialStatus
    hasForcedPlan: Boolean!
    pendingCancelAt: DateTime
    paymentProvider: PurchaseSource
    vercelConfiguration: VercelConfiguration
  }

  enum TeamUserLevel {
    owner
    member
  }

  type TeamMemberConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamMember!]!
  }

  type TeamMember implements Node {
    id: ID!
    user: User!
    level: TeamUserLevel!
  }

  type RemoveUserFromTeamPayload {
    teamMemberId: ID!
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

  extend type Query {
    invitation(token: String!): Team
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
    "Accept an invitation to join a team"
    acceptInvitation(token: String!): Team!
    "Set member level"
    setTeamMemberLevel(input: SetTeamMemberLevelInput!): TeamMember!
    "Delete team and all its projects"
    deleteTeam(input: DeleteTeamInput!): Boolean!
  }
`;

export const resolvers: IResolvers = {
  TeamMember: {
    user: async (teamUser, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: teamUser.userId,
      });
      if (!account) {
        throw new Error("Invariant: account is undefined");
      }
      return account;
    },
    level: (teamUser) => teamUser.userLevel as ITeamUserLevel,
  },
  Team: {
    me: async (account, _args, ctx) => {
      if (!account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      if (!Team.checkReadPermission(account.teamId, ctx.auth.user)) {
        throw new Error("Forbidden");
      }

      return TeamUser.query()
        .where("teamId", account.teamId)
        .where("userId", ctx.auth.user.id)
        .first()
        .throwIfNotFound();
    },
    members: async (account, args, ctx) => {
      if (!account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      if (!Team.checkReadPermission(account.teamId, ctx.auth.user)) {
        throw new Error("Forbidden");
      }
      const { first, after } = args;
      const result = await TeamUser.query()
        .where("teamId", account.teamId)
        .orderByRaw(
          `(CASE WHEN "userId" = ? THEN 0
           ELSE "id"
           END) ASC
          `,
          ctx.auth.user.id
        )
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    inviteLink: async (account, _args, ctx) => {
      if (!account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      if (!Team.checkWritePermission(account.teamId, ctx.auth.user)) {
        throw new Error("Forbidden");
      }
      const team = await account.$relatedQuery("team");
      return team.$getInviteLink();
    },
  },
  Query: {
    invitation: async (_root, { token }) => {
      const team = await Team.verifyInviteToken(token);
      if (!team) {
        throw new Error("Invalid token");
      }
      return team.$relatedQuery("account");
    },
  },
  Mutation: {
    createTeam: async (_root, args, ctx) => {
      const { auth } = ctx;

      if (!auth) {
        throw new Error("Forbidden");
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
          account: teamAccount,
          plan,
          purchaserAccount: auth.account,
          trial,
          successUrl: teamUrl,
          cancelUrl: `${teamUrl}?checkout=cancel`,
        });
        if (!session.url) {
          throw new Error("session.url is null");
        }

        return { team: teamAccount, redirectUrl: session.url };
      };

      // If the user has already subscribed to a trial, we will redirect to the checkout page
      if (hasSubscribedToTrial) {
        return redirectToStripe({ trial: false });
      }

      // Else we will try to setup trial server-side

      // Try to get or create a Stripe customer for the user
      const stripeCustomerId = await getOrCreateUserCustomerId(auth.account);

      // If we failed to create a customer (no email), we will redirect to checkout page
      if (!stripeCustomerId) {
        return redirectToStripe({ trial: true });
      }

      // Register the Stripe customer id to the team account
      await teamAccount.$query().patchAndFetch({ stripeCustomerId });

      const price = await getStripePriceFromPlanOrThrow(plan);

      // Create a Stripe subscription for the user
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        ...getTrialSubscriptionConfig(),
      });

      await createPurchaseFromSubscription({
        subscription,
        account: teamAccount,
        purchaserId: auth.user.id,
      });

      return {
        team: teamAccount,
        redirectUrl: teamUrl,
      };
    },
    leaveTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }

      const account = await Account.query()
        .findById(args.input.teamAccountId)
        .throwIfNotFound();

      const count = await TeamUser.query()
        .where({ teamId: account.teamId })
        .resultSize();

      if (count === 1) {
        throw new GraphQLError(
          "You are the last user of this team, you can't leave it"
        );
      }

      await transaction(async (trx) => {
        if (!ctx.auth) {
          throw new Error("Forbidden");
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
        throw new Error("Forbidden");
      }
      const [teamAccount, userAccount] = await Promise.all([
        getWritableAccount({
          id: args.input.teamAccountId,
          user: ctx.auth.user,
        }),
        Account.query().findById(args.input.userAccountId).throwIfNotFound(),
      ]);

      const count = await TeamUser.query()
        .where({ teamId: teamAccount.teamId })
        .resultSize();

      if (count === 1) {
        throw new Error("Can't remove the last user of a team.");
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
          throw new Error("Forbidden");
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
    acceptInvitation: async (_root, args, ctx): Promise<Account> => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      const team = await Team.verifyInviteToken(args.token);
      if (!team) {
        throw new Error("Invalid token");
      }

      const account = await team.$relatedQuery("account");

      if (!account) {
        throw new Error("Invalid token");
      }

      const teamUser = await TeamUser.query().findOne({
        teamId: team.id,
        userId: ctx.auth.user.id,
      });

      if (teamUser) {
        return account;
      }

      await TeamUser.query().insert({
        userId: ctx.auth.user.id,
        teamId: team.id,
        userLevel: "member",
      });

      return account;
    },
    setTeamMemberLevel: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      const [teamAccount, userAccount] = await Promise.all([
        getWritableAccount({
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
  },
};
