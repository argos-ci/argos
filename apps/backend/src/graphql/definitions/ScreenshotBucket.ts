import gqlTag from "graphql-tag";

import { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  type ArtifactBucket implements Node {
    id: ID!
    createdAt: DateTime!
    commit: String!
    branch: String
  }
`;

export const resolvers: IResolvers = {
  ArtifactBucket: {
    branch(bucket) {
      return bucket.branch || null;
    },
  },
};
