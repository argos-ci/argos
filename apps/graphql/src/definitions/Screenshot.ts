import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import type { Screenshot } from "@argos-ci/database/models";
import { s3 as getS3, getSignedGetObjectUrl } from "@argos-ci/storage";

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
      const s3 = getS3();
      return getSignedGetObjectUrl({
        s3,
        Bucket: config.get("s3.screenshotsBucket"),
        Key: screenshot.s3Id,
        expiresIn: 7200,
      });
    },
  },
};
