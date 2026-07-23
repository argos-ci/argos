import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum PlanInterval {
    month
    year
  }

  type Plan implements Node {
    id: ID!
    displayName: String!
    interval: PlanInterval!
    usageBased: Boolean!
    githubSsoIncluded: Boolean!
    fineGrainedAccessControlIncluded: Boolean!
    samlIncluded: Boolean!
  }
`;
