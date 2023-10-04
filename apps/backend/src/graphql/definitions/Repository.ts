import gqlTag from "graphql-tag";
import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  interface Repository implements Node {
    id: ID!
    defaultBranch: String!
    private: Boolean!
    fullName: String!
    url: String!
  }
`;

export const resolvers: IResolvers = {
  Repository: {
    __resolveType: (repository) => {
      switch (repository.constructor.name) {
        case "GithubRepository":
          return "GithubRepository";
        case "GitlabProject":
          return "GitlabProject";
        default:
          throw new Error(
            `Unknown repository type: ${repository.constructor.name}`,
          );
      }
    },
  },
};
