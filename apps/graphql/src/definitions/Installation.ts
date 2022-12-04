import gqlTag from "graphql-tag";

import type { Installation } from "@argos-ci/database/models";

const { gql } = gqlTag;

export const typeDefs = gql`
  type Installation implements Node {
    id: ID!
    latestSynchronization: Synchronization
  }
`;

export const resolvers = {
  Installation: {
    latestSynchronization: async (installation: Installation) => {
      return installation.$relatedQuery("synchronizations").first();
    },
  },
};
