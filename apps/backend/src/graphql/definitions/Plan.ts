import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Plan implements Node {
    id: ID!
    name: String!
    screenshotsLimitPerMonth: Int!
  }
`;

const firstUpper = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const resolvers: IResolvers = {
  Plan: {
    name: (plan) => firstUpper(plan.name),
  },
};
