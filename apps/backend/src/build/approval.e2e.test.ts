import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { ScreenshotDiff, type Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getPreviousDiffApprovalIds } from "./approval";

const test = it.extend<{
  build: Build;
}>({
  build: async ({}, use) => {
    const project = await factory.Project.create();
    const previousBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const previousBuild = await factory.Build.create({
      compareScreenshotBucketId: previousBucket.id,
      conclusion: "changes-detected",
    });
    const files = await factory.File.createMany(3, { type: "screenshot" });
    const previousScreenshots = await factory.Screenshot.createMany(
      3,
      files.map((file) => ({ fileId: file.id })),
    );
    const previousDiffs = await factory.ScreenshotDiff.createMany(
      3,
      previousScreenshots.map((screenshot) => ({
        buildId: previousBuild.id,
        compareScreenshotId: screenshot.id,
      })),
    );
    const buildReview = await factory.BuildReview.create({
      buildId: previousBuild.id,
      state: "approved",
    });
    await factory.ScreenshotDiffReview.createMany(
      3,
      previousDiffs.map((diff) => ({
        buildReviewId: buildReview.id,
        screenshotDiffId: diff.id,
        state: "approved",
      })),
    );
    await ScreenshotDiff.fetchGraph(previousDiffs, "compareScreenshot");
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const build = await factory.Build.create({
      compareScreenshotBucketId: bucket.id,
      conclusion: "changes-detected",
    });
    const screenshots = await factory.Screenshot.createMany(
      3,
      files.map((file) => ({ fileId: file.id })),
    );
    await factory.ScreenshotDiff.createMany(
      3,
      screenshots.map((screenshot) => ({
        buildId: build.id,
        compareScreenshotId: screenshot.id,
      })),
    );
    await use(build);
  },
});

describe("getPreviousDiffApprovalIds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("returns files with a previous approval", async ({ build }) => {
    await build.$fetchGraph("compareScreenshotBucket");
    const compareBucket = build.compareScreenshotBucket;
    invariant(compareBucket);
    const diffIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
    });
    const diffs = await ScreenshotDiff.query().where("buildId", build.id);
    expect(diffIds).toHaveLength(3);
    expect(diffIds.sort()).toEqual(diffs.map((diff) => diff.id).sort());
  });
});
