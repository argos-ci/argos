import gqlTag from "graphql-tag";

import type { Screenshot } from "@argos-ci/database/models";
import { getPublicUrl } from "@argos-ci/storage";
import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Screenshot {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    url: String!
    width: Int
    height: Int
  }
`;

export const resolvers = {
  Screenshot: {
    url: (screenshot: Screenshot) => {
      return getPublicUrl(screenshot.s3Id);
    },
    width: async (
      screenshot: Screenshot,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!screenshot.fileId) return null;
      const file = await context.loaders.File.load(screenshot.fileId);
      return file.width;
    },
    height: async (
      screenshot: Screenshot,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!screenshot.fileId) return null;
      const file = await context.loaders.File.load(screenshot.fileId);
      return file.height;
    },
  },
};
