import gqlTag from "graphql-tag";

import type { Team } from "@argos-ci/database/models";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Team implements Node {
    id: ID!
    account: Account!
  }
`;

export const resolvers = {
  Team: {
    account: async (team: Team, _args: Record<string, never>, ctx: Context) => {
      return ctx.loaders.AccountFromRelation.load({ teamId: team.id });
    },
  },
};
