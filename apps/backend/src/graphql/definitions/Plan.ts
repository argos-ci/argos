import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Plan implements Node {
    id: ID!
    displayName: String!
    usageBased: Boolean!
  }
`;
