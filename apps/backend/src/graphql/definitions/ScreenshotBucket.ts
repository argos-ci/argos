import gqlTag from "graphql-tag";

import { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type ScreenshotBucket implements Node {
    id: ID!
    createdAt: DateTime!
    commit: String!
    branch: String
  }
`;

export const resolvers: IResolvers = {
  ScreenshotBucket: {
    branch(screenshotBucket) {
      return screenshotBucket.branch || null;
    },
  },
};
