import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GitlabProject implements Node & Repository {
    id: ID!
    defaultBranch: String!
    private: Boolean!
    fullName: String!
    url: String!
  }
`;

export const resolvers: IResolvers = {
  GitlabProject: {
    url: (gitlabProject) => {
      return `https://gitlab.com/${gitlabProject.pathWithNamespace}`;
    },
    fullName: (gitlabProject) => {
      return gitlabProject.pathWithNamespace;
    },
  },
};
