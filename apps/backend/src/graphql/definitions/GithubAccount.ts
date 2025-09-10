import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types.js";
import { getAvatarColor, getGitHubAvatarFactory } from "../services/avatar.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubAccount implements Node {
    id: ID!
    login: String!
    name: String
    url: String!
    avatar: AccountAvatar!
    lastLoggedAt: DateTime
  }
`;

export const resolvers: IResolvers = {
  GithubAccount: {
    url: (ghAccount) => {
      return `https://github.com/${ghAccount.login}`;
    },
    avatar: (ghAccount) => {
      const initial = (
        (ghAccount.name || ghAccount.login)[0] || "x"
      ).toUpperCase();
      const color = getAvatarColor(ghAccount.id);

      return {
        url: getGitHubAvatarFactory({ login: ghAccount.login }),
        initial,
        color,
      };
    },
  },
};
