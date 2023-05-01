import slugify from "@sindresorhus/slugify";
import gqlTag from "graphql-tag";

import { transaction } from "@argos-ci/database";
import { Account, Team, TeamUser } from "@argos-ci/database/models";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { getWritableAccount } from "./Account.js";
import { paginateResult } from "./PageInfo.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Team implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    screenshotsLimitPerMonth: Int
    slug: String!
    name: String
    plan: Plan
    purchase: Purchase
    permissions: [Permission!]!
    projects(after: Int!, first: Int!): ProjectConnection!
    ghAccount: GithubAccount
    avatar: AccountAvatar!
    users(after: Int = 0, first: Int = 30): UserConnection!
    inviteLink: String!
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

  extend type Query {
    invitation(token: String!): Team
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): Team!
    "Leave a team"
    leaveTeam(input: LeaveTeamInput!): Boolean!
    "Remove a user from a team"
    removeUserFromTeam(input: RemoveUserFromTeamInput!): Boolean!
    "Accept an invitation to join a team"
    acceptInvitation(token: String!): Team!
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
  Team: {
    users: async (account, args, ctx) => {
      if (!account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      if (!Team.checkWritePermission(account.teamId, ctx.auth.user)) {
        throw new Error("Forbidden");
      }
      const { first, after } = args;
      const query = Account.query()
        .orderBy("team_users.id", "asc")
        .join("team_users", "team_users.userId", "accounts.userId")
        .where("team_users.teamId", account.teamId)
        .range(after, after + first - 1);

      const result = await query;

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

      await TeamUser.query().delete().where({
        userId: userAccount.userId,
        teamId: teamAccount.teamId,
      });

      return true;
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
        userLevel: "owner",
      });

      return account;
    },
  },
};
