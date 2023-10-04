import gqlTag from "graphql-tag";

import { getPublicUrl } from "@/storage/index.js";

import type { IResolvers } from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Screenshot implements Node {
    id: ID!
    url: String!
    width: Int
    height: Int
  }
`;

export const resolvers: IResolvers = {
  Screenshot: {
    url: (screenshot) => {
      return getPublicUrl(screenshot.s3Id);
    },
    width: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      return file.width;
    },
    height: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      return file.height;
    },
  },
};
