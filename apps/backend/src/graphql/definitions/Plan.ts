import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum PlanInterval {
    month
    year
  }

  type Plan implements Node {
    id: ID!
    "Internal name, stable across renames of the marketing label."
    name: String!
    displayName: String!
    interval: PlanInterval!
    usageBased: Boolean!
    githubSsoIncluded: Boolean!
    fineGrainedAccessControlIncluded: Boolean!
    samlIncluded: Boolean!
  }
`;
