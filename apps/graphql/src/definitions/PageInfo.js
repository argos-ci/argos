import { gql } from "graphql-tag";

export const typeDefs = gql`
  type PageInfo {
    totalCount: Int!
    endCursor: Int!
    hasNextPage: Boolean!
  }
`;
