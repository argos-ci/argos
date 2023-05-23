import slugify from "@sindresorhus/slugify";
import gqlTag from "graphql-tag";

import { transaction } from "@argos-ci/database";
import { Account, Team, TeamUser } from "@argos-ci/database/models";

import type {
  IResolvers,
  ITeamUserLevel,
} from "../__generated__/resolver-types.js";
import { getWritableAccount } from "./Account.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Team implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    hasUsageBasedPlan: Boolean!
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
    purchaseStatus: PurchaseStatus!
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

  extend type Query {
    invitation(token: String!): Team
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): Team!
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
  }
`;

const resolveTeamSlug = async (name: string, index = 0): Promise<string> => {
  const nameSlug = slugify(name);
  const slug = index ? `${nameSlug}-${index}` : nameSlug;

  const existingAccount = await Account.query()
    .select("id")
    .where({ slug })
    .first();

  if (!existingAccount) {
    return slug;
  }

  return resolveTeamSlug(name, index + 1);
};

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
        .where("userId", ctx.auth.user.id)
        .union(
          TeamUser.query()
            .where("teamId", account.teamId)
            .whereNot("userId", ctx.auth.user.id)
            .orderBy("id", "asc")
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
    createTeam: async (_root, args, ctx): Promise<Account> => {
      const { auth } = ctx;

      if (!auth) {
        throw new Error("Forbidden");
      }

      const slug = await resolveTeamSlug(args.input.name);
      return transaction(async (trx) => {
        const team = await Team.query(trx).insertAndFetch({});
        await TeamUser.query(trx).insert({
          userId: auth.user.id,
          teamId: team.id,
          userLevel: "owner",
        });
        return Account.query(trx).insertAndFetch({
          name: args.input.name,
          slug,
          teamId: team.id,
        });
      });
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
        throw new Error(
          "You are the last user of this team, you can't leave it"
        );
      }

      await TeamUser.query().delete().where({
        userId: ctx.auth.user.id,
        teamId: account.teamId,
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

      await teamUser?.$query().delete();

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
  },
};
