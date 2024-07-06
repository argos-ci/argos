import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getPublicImageUrl } from "@/storage/index.js";

import type {
  IResolvers,
  IScreenshotDiffStatus,
} from "../__generated__/resolver-types.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum ScreenshotDiffStatus {
    pending
    removed
    failure
    added
    changed
    unchanged
    retryFailure
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
    flakyDetected: Boolean! @deprecated(reason: "Remove in future release")
    test: Test @deprecated(reason: "Remove in future release")
    group: String
    threshold: Float
  }

  type ScreenshotDiffConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ScreenshotDiff!]!
  }
`;

export const resolvers: IResolvers = {
  ScreenshotDiff: {
    baseScreenshot: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.baseScreenshotId) {
        return null;
      }
      return ctx.loaders.Screenshot.load(screenshotDiff.baseScreenshotId);
    },
    compareScreenshot: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.compareScreenshotId) {
        return null;
      }
      return ctx.loaders.Screenshot.load(screenshotDiff.compareScreenshotId);
    },
    url: async (screenshotDiff) => {
      if (!screenshotDiff.s3Id) {
        return null;
      }
      return getPublicImageUrl(screenshotDiff.s3Id);
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
      invariant(name, "screenshot diff without name");
      return name;
    },
    width: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(screenshotDiff.fileId);
      invariant(file, "File not found");
      return file.width;
    },
    height: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.fileId) {
        return null;
      }
      const file = await ctx.loaders.File.load(screenshotDiff.fileId);
      invariant(file, "File not found");
      return file.height;
    },
    status: async (screenshotDiff, _args, ctx) => {
      const diffStatus = await screenshotDiff.$getDiffStatus(async (id) => {
        const screenshot = await ctx.loaders.Screenshot.load(id);
        invariant(screenshot, "Screenshot not found");
        return screenshot;
      });

      return diffStatus as IScreenshotDiffStatus;
    },
    threshold: async (screenshotDiff, _args, ctx) => {
      if (
        !screenshotDiff.compareScreenshotId ||
        !screenshotDiff.baseScreenshotId
      ) {
        return null;
      }
      const compareScreenshot = await ctx.loaders.Screenshot.load(
        screenshotDiff.compareScreenshotId,
      );
      return compareScreenshot?.threshold ?? null;
    },
  },
};
