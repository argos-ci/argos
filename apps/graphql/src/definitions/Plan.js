import { gql } from "graphql-tag";

export const typeDefs = gql`
  type Plan {
    id: ID!
    name: String
    screenshotsLimitPerMonth: Int!
    githubId: ID!
  }
`;
