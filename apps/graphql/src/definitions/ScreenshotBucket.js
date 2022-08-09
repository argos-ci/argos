import { gql } from "graphql-tag";

export const typeDefs = gql`
  type ScreenshotBucket {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    commit: String!
    branch: String!
  }
`;
