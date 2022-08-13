import { gql } from "graphql-tag";

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
    async plan(purchase) {
      return purchase.$relatedQuery("plan");
    },
  },
};
