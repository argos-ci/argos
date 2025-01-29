import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getPublicImageFileUrl, getTwicPicsUrl } from "@/storage/index.js";

import {
  IResolvers,
  IScreenshotDiffResolvers,
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
    "Name of the diff (either base or compare screenshot name)"
    name: String!
    "Base name of the diff, same for all retries"
    baseName: String!
    width: Int
    height: Int
    status: ScreenshotDiffStatus!
    group: String
    threshold: Float
  }

  type ScreenshotDiffConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ScreenshotDiff!]!
  }
`;

const nameResolver: IScreenshotDiffResolvers["name"] = async (
  screenshotDiff,
  _args,
  ctx,
) => {
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
};

const statusResolver: IScreenshotDiffResolvers["status"] = async (
  screenshotDiff,
  _args,
  ctx,
) => {
  const diffStatus = await screenshotDiff.$getDiffStatus(async (id) => {
    const screenshot = await ctx.loaders.Screenshot.load(id);
    invariant(screenshot, "Screenshot not found");
    return screenshot;
  });

  return diffStatus as IScreenshotDiffStatus;
};

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
    url: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.fileId) {
        if (!screenshotDiff.s3Id) {
          return null;
        }
        return getTwicPicsUrl(screenshotDiff.s3Id);
      }
      const file = await ctx.loaders.File.load(screenshotDiff.fileId);
      invariant(file, "File not found");
      return getPublicImageFileUrl(file);
    },
    name: nameResolver,
    baseName: async (...args) => {
      const [name, status] = await Promise.all([
        nameResolver(...args),
        statusResolver(...args),
      ]);

      if (
        status === IScreenshotDiffStatus.Failure ||
        status === IScreenshotDiffStatus.RetryFailure
      ) {
        // Match ":name #num (failed).png"
        const match = name.match(/^(.*) #\d+ \(failed\)\.png$/);
        if (match && match[1]) {
          return match[1];
        }
        return name;
      }

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
    status: statusResolver,
    threshold: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.compareScreenshotId) {
        return null;
      }
      const compareScreenshot = await ctx.loaders.Screenshot.load(
        screenshotDiff.compareScreenshotId,
      );
      return compareScreenshot?.threshold ?? null;
    },
  },
};
