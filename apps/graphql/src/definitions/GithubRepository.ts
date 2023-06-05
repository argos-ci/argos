import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubRepository implements Node {
    id: ID!
    defaultBranch: String!
    private: Boolean!
    fullName: String!
  }
`;

export const resolvers: IResolvers = {
  GithubRepository: {
    fullName: async (repository, _args, ctx) => {
      const account = await ctx.loaders.GithubAccount.load(
        repository.githubAccountId
      );
      return `${account.login}/${repository.name}`;
    },
  },
};
