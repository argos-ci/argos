import slugify from "@sindresorhus/slugify";
import gqlTag from "graphql-tag";

import { transaction } from "@argos-ci/database";
import { Account, Team, TeamUser } from "@argos-ci/database/models";

import type { Context } from "../context.js";

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
  }

  input CreateTeamInput {
    name: String!
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): Team!
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
  },
};
