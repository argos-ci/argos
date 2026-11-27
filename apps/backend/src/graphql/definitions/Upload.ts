import gqlTag from "graphql-tag";

import { createUpload } from "@/storage/public-files";

import type { IResolvers } from "../__generated__/resolver-types";
import { unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  Where the browser sends a file: a POST of multipart form data with every
  entry of \`fields\`, then the file last as \`file\`. The mutation the file is
  for takes \`key\`.
  """
  type Upload {
    url: String!
    fields: JSONObject!
    "Largest file accepted, in bytes"
    maxBytes: Int!
    key: String!
  }

  extend type Mutation {
    "Get where to upload a file from the browser"
    createUpload: Upload!
  }
`;

export const resolvers: IResolvers = {
  Mutation: {
    createUpload: async (_root, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return createUpload({ userId: ctx.auth.user.id });
    },
  },
};
