import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type ScreenshotBucket implements Node {
    id: ID!
    createdAt: DateTime!
    commit: String!
    branch: String!
  }
`;
