import { gql } from "graphql-tag";

export const typeDefs = gql`
  enum ValidationStatus {
    unknown
    accepted
    rejected
  }
`;
