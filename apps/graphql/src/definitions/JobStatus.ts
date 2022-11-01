import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum JobStatus {
    pending
    progress
    complete
    error
    aborted
  }
`;
