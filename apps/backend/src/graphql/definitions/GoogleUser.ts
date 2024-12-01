import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GoogleUser implements Node {
    id: ID!
    name: String
    primaryEmail: String
    lastLoggedAt: DateTime
  }
`;
