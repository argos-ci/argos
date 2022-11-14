import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
import type { ScreenshotDiff, Screenshot } from "@argos-ci/database/models";

import { ScreenshotLoader, FileLoader } from "../loaders.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum ScreenshotDiffStatus {
    added
    stable
    updated
    failed
    removed
  }

  type ScreenshotDiff {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: ID!
    baseScreenshotId: ID
    baseScreenshot: Screenshot
    compareScreenshotId: ID
    compareScreenshot: Screenshot
    score: Float
    url: String
    "Represent the state of the job generating the diffs"
    jobStatus: JobStatus
    "Represent the status given by the user"
    validationStatus: ValidationStatus!
    status: ScreenshotDiffStatus!
    rank: Int
    name: String!
    width: Int
    height: Int
  }

  type ScreenshotDiffResult {
    pageInfo: PageInfo!
    edges: [ScreenshotDiff!]!
  }
`;

export const resolvers = {
  ScreenshotDiff: {
    baseScreenshot: async (screenshotDiff: ScreenshotDiff) => {
      if (!screenshotDiff.baseScreenshotId) return null;
      return ScreenshotLoader.load(screenshotDiff.baseScreenshotId);
    },
    compareScreenshot: async (screenshotDiff: ScreenshotDiff) => {
      if (!screenshotDiff.compareScreenshotId) return null;
      return ScreenshotLoader.load(screenshotDiff.compareScreenshotId);
    },
    url: (screenshotDiff: ScreenshotDiff) => {
      if (!screenshotDiff.s3Id) return null;
      return new URL(
        `/screenshots/${screenshotDiff.s3Id}`,
        config.get("server.url")
      );
    },
    status: async (screenshotDiff: ScreenshotDiff) => {
      if (!screenshotDiff.compareScreenshotId) return "removed";

      if (screenshotDiff.score === null) {
        const { name } = await ScreenshotLoader.load(
          screenshotDiff.compareScreenshotId
        );
        return name.match("(failed)") ? "failed" : "added";
      }

      return screenshotDiff.score > 0 ? "updated" : "stable";
    },
    name: async (screenshotDiff: ScreenshotDiff) => {
      const [baseScreenshot, compareScreenshot] = await Promise.all([
        screenshotDiff.baseScreenshotId
          ? ScreenshotLoader.load(screenshotDiff.baseScreenshotId)
          : null,
        screenshotDiff.compareScreenshotId
          ? ScreenshotLoader.load(screenshotDiff.compareScreenshotId)
          : null,
      ]);
      const name = baseScreenshot?.name || compareScreenshot?.name;
      if (!name) {
        throw new Error("ScreenshotDiff without name");
      }
      return name;
    },
    width: async (screenshot: Screenshot) => {
      if (!screenshot.fileId) return null;
      const file = await FileLoader.load(screenshot.fileId);
      return file.width;
    },
    height: async (screenshot: Screenshot) => {
      if (!screenshot.fileId) return null;
      const file = await FileLoader.load(screenshot.fileId);
      return file.height;
    },
  },
};
