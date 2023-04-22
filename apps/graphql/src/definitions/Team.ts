import slugify from "@sindresorhus/slugify";
import gqlTag from "graphql-tag";

import { transaction } from "@argos-ci/database";
import { Account, Team, TeamUser } from "@argos-ci/database/models";

import type { Context } from "../context.js";
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

    users(after: Int!, first: Int!): UserConnection!
  }

  input CreateTeamInput {
    name: String!
  }

  input LeaveTeamInput {
    accountId: ID!
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): Team!
    "Leave a team"
    leaveTeam(input: LeaveTeamInput!): Boolean!
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

export const resolvers = {
  Team: {
    users: async (account: Account, args: { first: number; after: number }) => {
      if (!account.teamId) {
        throw new Error("Invariant: account.teamId is undefined");
      }
      const { first, after } = args;
      const result = await Account.query()
        .orderBy("team_users.id", "asc")
        .join("team_users", "team_users.userId", "accounts.userId")
        .where("team_users.teamId", account.teamId)
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
  },
  Mutation: {
    createTeam: async (
      _root: unknown,
      { input: { name } }: { input: { name: string } },
      { auth }: Context
    ): Promise<Account> => {
      if (!auth) {
        throw new Error("Forbidden");
      }

      const slug = await resolveTeamSlug(name);
      return transaction(async (trx) => {
        const team = await Team.query(trx).insertAndFetch({});
        await TeamUser.query(trx).insert({
          userId: auth.user.id,
          teamId: team.id,
          userLevel: "owner",
        });
        return Account.query(trx).insertAndFetch({
          name: name.trim(),
          slug,
          teamId: team.id,
        });
      });
    },
    leaveTeam: async (
      _root: unknown,
      args: { input: { accountId: string } },
      { auth }: Context
    ) => {
      if (!auth) {
        throw new Error("Forbidden");
      }
      const account = await Account.query()
        .findById(args.input.accountId)
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
        userId: auth.user.id,
        teamId: account.teamId,
      });

      return true;
    },
  },
};
