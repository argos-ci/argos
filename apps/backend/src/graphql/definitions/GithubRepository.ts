import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubRepository implements Node & Repository {
    id: ID!
    defaultBranch: String!
    private: Boolean!
    fullName: String!
    url: String!
  }
`;

export const resolvers: IResolvers = {
  GithubRepository: {
    fullName: async (repository, _args, ctx) => {
      const account = await ctx.loaders.GithubAccount.load(
        repository.githubAccountId,
      );
      invariant(account, "Account not found");
      return `${account.login}/${repository.name}`;
    },
    url: async (repository, _args, ctx) => {
      const account = await ctx.loaders.GithubAccount.load(
        repository.githubAccountId,
      );
      invariant(account, "Account not found");
      return `https://github.com/${account.login}/${repository.name}`;
    },
  },
};
