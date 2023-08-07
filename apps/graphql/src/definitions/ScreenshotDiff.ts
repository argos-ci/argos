import gqlTag from "graphql-tag";

import { getPublicUrl } from "@argos-ci/storage";

import type {
  IResolvers,
  IScreenshotDiffStatus,
} from "../__generated__/resolver-types.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum ScreenshotDiffStatus {
    added
    unchanged
    changed
    failure
    removed
  }

  type ScreenshotDiff implements Node {
    id: ID!
    createdAt: DateTime!
    baseScreenshot: Screenshot
    compareScreenshot: Screenshot
    url: String
    name: String!
    width: Int
    height: Int
    status: ScreenshotDiffStatus!
    validationStatus: String
    flakyDetected: Boolean!
    test: Test
  }

  type ScreenshotDiffConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ScreenshotDiff!]!
  }
`;

export const resolvers: IResolvers = {
  ScreenshotDiff: {
    baseScreenshot: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.baseScreenshotId) return null;
      return ctx.loaders.Screenshot.load(screenshotDiff.baseScreenshotId);
    },
    compareScreenshot: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.compareScreenshotId) return null;
      return ctx.loaders.Screenshot.load(screenshotDiff.compareScreenshotId);
    },
    url: (screenshotDiff) => {
      if (!screenshotDiff.s3Id) return null;
      return getPublicUrl(screenshotDiff.s3Id);
    },
    name: async (screenshotDiff, _args, ctx) => {
      const [baseScreenshot, compareScreenshot] = await Promise.all([
        screenshotDiff.baseScreenshotId
          ? ctx.loaders.Screenshot.load(screenshotDiff.baseScreenshotId)
          : null,
        screenshotDiff.compareScreenshotId
          ? ctx.loaders.Screenshot.load(screenshotDiff.compareScreenshotId)
          : null,
      ]);
      const name = baseScreenshot?.name || compareScreenshot?.name;
      if (!name) {
        throw new Error("ScreenshotDiff without name");
      }
      return name;
    },
    width: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      return file.width;
    },
    height: async (screenshot, _args, ctx) => {
      if (!screenshot.fileId) return null;
      const file = await ctx.loaders.File.load(screenshot.fileId);
      return file.height;
    },
    status: (screenshotDiff, _args, ctx) => {
      return screenshotDiff.$getDiffStatus(
        ctx.loaders.Screenshot.load.bind(ctx.loaders.Screenshot),
      ) as Promise<IScreenshotDiffStatus>;
    },
    flakyDetected: (screenshotDiff) => {
      return Boolean(
        screenshotDiff.stabilityScore !== null &&
          screenshotDiff.stabilityScore < 60,
      );
    },
    test: async (screenshot, _args, ctx) => {
      if (!screenshot.testId) return null;
      return ctx.loaders.Test.load(screenshot.testId);
    },
  },
};
