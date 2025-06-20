import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { getStartDateFromPeriod } from "@/metrics/test.js";
import { getPublicImageFileUrl, getTwicPicsUrl } from "@/storage/index.js";

import {
  IResolvers,
  IScreenshotDiffResolvers,
  IScreenshotDiffStatus,
} from "../__generated__/resolver-types.js";
import { formatTestChangeId } from "../services/test.js";
import { getVariantKey } from "../services/variant-key.js";

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
    build: Build!
    baseScreenshot: Screenshot
    compareScreenshot: Screenshot
    url: String
    "Name of the diff (either base or compare screenshot name)"
    name: String!
    "Unique key to identify screenshot variant (browser, resolution, retries)"
    variantKey: String!
    "Change ID of the screenshot diff. Used to be indefied in a test."
    changeId: String
    width: Int
    height: Int
    status: ScreenshotDiffStatus!
    group: String
    threshold: Float
    test: Test
    occurrences(period: MetricsPeriod!): Int!
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
    changeId: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.fileId) {
        return null;
      }
      const build = await ctx.loaders.Build.load(screenshotDiff.buildId);
      invariant(build, "ScreenshotDiff without build");
      const project = await ctx.loaders.Project.load(build.projectId);
      invariant(project, "Build without project");
      return formatTestChangeId({
        projectName: project.name,
        fileId: screenshotDiff.fileId,
      });
    },
    build: async (screenshotDiff, _args, ctx) => {
      const build = await ctx.loaders.Build.load(screenshotDiff.buildId);
      invariant(build, "ScreenshotDiff without build");
      return build;
    },
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
    variantKey: async (...args) => {
      const name = await nameResolver(...args);
      return getVariantKey(name);
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
    test: async (screenshotDiff, _args, ctx) => {
      if (!screenshotDiff.testId) {
        return null;
      }
      const test = await ctx.loaders.Test.load(screenshotDiff.testId);
      invariant(test, "Test not found");
      return test;
    },
    occurrences: async (screenshotDiff, args, ctx) => {
      if (!screenshotDiff.fileId || !screenshotDiff.testId) {
        return 0;
      }
      const from = getStartDateFromPeriod(args.period);
      const count = await ctx.loaders
        .getChangesOccurencesLoader(from.toISOString())
        .load({
          fileId: screenshotDiff.fileId,
          testId: screenshotDiff.testId,
        });
      return count;
    },
  },
};
