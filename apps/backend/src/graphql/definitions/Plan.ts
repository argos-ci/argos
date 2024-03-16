import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type Plan implements Node {
    id: ID!
    displayName: String!
    usageBased: Boolean!
    githubSsoIncluded: Boolean!
    fineGrainedAccessControlIncluded: Boolean!
  }
`;
