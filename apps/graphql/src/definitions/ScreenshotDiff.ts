import gqlTag from "graphql-tag";

import type { ScreenshotDiff, Screenshot } from "@argos-ci/database/models";

import { getPublicUrl } from "@argos-ci/storage";
import type { Context } from "../context.js";

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
    baseScreenshot: async (
      screenshotDiff: ScreenshotDiff,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!screenshotDiff.baseScreenshotId) return null;
      return context.loaders.Screenshot.load(screenshotDiff.baseScreenshotId);
    },
    compareScreenshot: async (
      screenshotDiff: ScreenshotDiff,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!screenshotDiff.compareScreenshotId) return null;
      return context.loaders.Screenshot.load(
        screenshotDiff.compareScreenshotId
      );
    },
    url: (screenshotDiff: ScreenshotDiff) => {
      if (!screenshotDiff.s3Id) return null;
      return getPublicUrl(screenshotDiff.s3Id);
    },
    status: async (
      screenshotDiff: ScreenshotDiff,
      _args: Record<string, never>,
      context: Context
    ) => {
      if (!screenshotDiff.compareScreenshotId) return "removed";

      if (screenshotDiff.score === null) {
        const { name } = await context.loaders.Screenshot.load(
          screenshotDiff.compareScreenshotId
        );
        return name.match("(failed)") ? "failed" : "added";
      }

      return screenshotDiff.score > 0 ? "updated" : "stable";
    },
    name: async (
      screenshotDiff: ScreenshotDiff,
      _args: Record<string, never>,
      context: Context
    ) => {
      const [baseScreenshot, compareScreenshot] = await Promise.all([
        screenshotDiff.baseScreenshotId
          ? context.loaders.Screenshot.load(screenshotDiff.baseScreenshotId)
          : null,
        screenshotDiff.compareScreenshotId
          ? context.loaders.Screenshot.load(screenshotDiff.compareScreenshotId)
          : null,
      ]);
      const name = baseScreenshot?.name || compareScreenshot?.name;
      if (!name) {
        throw new Error("ScreenshotDiff without name");
      }
      return name;
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
