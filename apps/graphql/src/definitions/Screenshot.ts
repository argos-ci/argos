import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import type { Screenshot } from "@argos-ci/database/models";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  type Screenshot {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    url: String!
  }
`;

export const resolvers = {
  Screenshot: {
    url: (screenshot: Screenshot) => {
      return new URL(
        `/screenshots/${screenshot.s3Id}`,
        config.get("server.url")
      );
    },
  },
};
