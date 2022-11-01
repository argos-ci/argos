import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type Plan {
    id: ID!
    name: String
    screenshotsLimitPerMonth: Int!
    githubId: ID!
  }
`;
