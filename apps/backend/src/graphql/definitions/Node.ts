import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  interface Node {
    id: ID!
  }
`;
