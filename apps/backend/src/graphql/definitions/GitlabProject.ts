import gqlTag from "graphql-tag";

import { getGitlabProjectUrl } from "@/gitlab";

import type { IResolvers } from "../__generated__/resolver-types";

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
    url: (gitlabProject) => getGitlabProjectUrl(gitlabProject),
    fullName: (gitlabProject) => {
      return gitlabProject.pathWithNamespace;
    },
  },
};
