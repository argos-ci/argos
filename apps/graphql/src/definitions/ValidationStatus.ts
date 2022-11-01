import gqlTag from "graphql-tag";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum ValidationStatus {
    unknown
    accepted
    rejected
  }
`;
