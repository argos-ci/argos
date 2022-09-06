import { gql } from "graphql-tag";
import config from "@argos-ci/config";
import { s3 as getS3, getSignedGetObjectUrl } from "@argos-ci/storage";
import { ScreenshotLoader } from "../loaders";

export const typeDefs = gql`
  type ScreenshotDiff {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: ID!
    baseScreenshotId: ID
    baseScreenshot: Screenshot
    compareScreenshotId: ID!
    compareScreenshot: Screenshot!
    score: Float
    url: String
    "Represent the state of the job generating the diffs"
    jobStatus: JobStatus
    "Represent the status given by the user"
    validationStatus: ValidationStatus!
  }

  type ScreenshotDiffResult {
    pageInfo: PageInfo!
    edges: [ScreenshotDiff!]!
  }
`;

export const resolvers = {
  ScreenshotDiff: {
    baseScreenshot: async (screenshotDiff) => {
      if (!screenshotDiff.baseScreenshotId) return null;
      return ScreenshotLoader.load(screenshotDiff.baseScreenshotId);
    },
    compareScreenshot: async (screenshotDiff) => {
      return ScreenshotLoader.load(screenshotDiff.compareScreenshotId);
    },
    url(screenshotDiff) {
      if (!screenshotDiff.s3Id) return null;
      const s3 = getS3();
      return getSignedGetObjectUrl({
        s3,
        Bucket: config.get("s3.screenshotsBucket"),
        Key: screenshotDiff.s3Id,
        expiresIn: 7200,
      });
    },
  },
};
