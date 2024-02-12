import gqlTag from "graphql-tag";
import type { IResolvers } from "../__generated__/resolver-types.js";
import { getAvatarColor } from "../services/avatar.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type GithubAccount implements Node {
    id: ID!
    login: String!
    name: String
    url: String!
    avatar: AccountAvatar!
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
        getUrl: ({ size }: { size?: number }) => {
          const baseUrl = `https://github.com/${ghAccount.login}.png`;
          if (!size) {
            return baseUrl;
          }
          return `${baseUrl}?size=${size}`;
        },
        initial,
        color,
      };
    },
  },
};
