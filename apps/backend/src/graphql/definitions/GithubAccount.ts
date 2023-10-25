import gqlTag from "graphql-tag";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubAccount implements Node {
    id: ID!
    login: String!
    name: String
  }
`;
