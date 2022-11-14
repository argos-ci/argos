import gqlTag from "graphql-tag";

import type { Purchase } from "@argos-ci/database/models";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Purchase {
    id: ID!
    plan: Plan!
    startDate: DateTime!
    endDate: DateTime
  }
`;

export const resolvers = {
  Purchase: {
    async plan(purchase: Purchase) {
      return purchase.$relatedQuery("plan");
    },
  },
};
