import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  type Synchronization {
    id: ID!
    jobStatus: JobStatus!
    type: String!
  }
`;
