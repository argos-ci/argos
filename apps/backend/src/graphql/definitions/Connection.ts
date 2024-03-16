import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  interface Connection {
    pageInfo: PageInfo!
    edges: [Node!]!
  }
`;
