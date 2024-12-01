import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GitlabUser implements Node {
    id: ID!
    name: String!
    username: String!
    url: String!
    lastLoggedAt: DateTime
  }
`;

export const resolvers: IResolvers = {
  GitlabUser: {
    url: (gitlabUser) => {
      return `https://gitlab.com/${gitlabUser.username}`;
    },
  },
};
