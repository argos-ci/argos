import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type SlackChannel implements Node {
    id: ID!
    slackId: String!
    name: String!
  }
`;
