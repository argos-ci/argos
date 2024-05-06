import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type SlackInstallation implements Node {
    id: ID!
    createdAt: DateTime!
    teamName: String!
    teamDomain: String!
  }
`;
