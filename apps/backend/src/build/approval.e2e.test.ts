import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  IgnoredChange,
  ScreenshotDiff,
  type Build,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getPreviousDiffApprovalIds } from "./approval";

const test = it.extend<{
  project: Project;
  previousBuild: Build;
  build: Build;
  compareBucket: ScreenshotBucket;
}>({
  project: async ({}, use) => {
    const project = await factory.Project.create();
    await use(project);
  },
  previousBuild: async ({ project }, use) => {
    const previousBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const previousBuild = await factory.Build.create({
      compareScreenshotBucketId: previousBucket.id,
      conclusion: "changes-detected",
      projectId: project.id,
      createdAt: new Date(Date.now() - 1000).toISOString(),
    });
    await use(previousBuild);
  },
  build: async ({ project, previousBuild }, use) => {
    void previousBuild;
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "feature",
      name: "default",
    });
    const build = await factory.Build.create({
      compareScreenshotBucketId: bucket.id,
      conclusion: "changes-detected",
      projectId: project.id,
      createdAt: new Date().toISOString(),
    });
    await use(build);
  },
  compareBucket: async ({ build }, use) => {
    await build.$fetchGraph("compareScreenshotBucket");
    const compareBucket = build.compareScreenshotBucket;
    invariant(compareBucket);
    await use(compareBucket);
  },
});

describe("getPreviousDiffApprovalIds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("returns diffs with a previous fingerprint approval", async ({
    previousBuild,
    build,
    compareBucket,
  }) => {
    const fingerprints = ["fp-1", "fp-2", "fp-3"];
    const previousFiles = await factory.File.createMany(3, {
      type: "screenshot",
    });
    const previousScreenshots = await factory.Screenshot.createMany(
      3,
      previousFiles.map((file) => ({ fileId: file.id })),
    );
    const previousDiffs = await factory.ScreenshotDiff.createMany(
      3,
      previousScreenshots.map((screenshot, index) => ({
        buildId: previousBuild.id,
        fileId: previousFiles[index]?.id ?? null,
        fingerprint: fingerprints[index] ?? null,
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
    const currentFiles = await factory.File.createMany(3, {
      type: "screenshot",
    });
    const screenshots = await factory.Screenshot.createMany(
      3,
      currentFiles.map((file) => ({ fileId: file.id })),
    );
    await factory.ScreenshotDiff.createMany(
      3,
      screenshots.map((screenshot, index) => ({
        buildId: build.id,
        fileId: currentFiles[index]?.id ?? null,
        fingerprint: fingerprints[index] ?? null,
        compareScreenshotId: screenshot.id,
      })),
    );
    const diffIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
    });
    const diffs = await ScreenshotDiff.query().where("buildId", build.id);
    expect(diffIds).toHaveLength(3);
    expect(diffIds.sort()).toEqual(diffs.map((diff) => diff.id).sort());
  });

  test("returns diffs with previous compare/base file approvals", async ({
    previousBuild,
    build,
    compareBucket,
  }) => {
    const compareFile = await factory.File.create({ type: "screenshot" });
    const baseFile = await factory.File.create({ type: "screenshot" });
    const previousCompareScreenshot = await factory.Screenshot.create({
      fileId: compareFile.id,
    });
    const previousBaseScreenshot = await factory.Screenshot.create({
      fileId: baseFile.id,
    });
    const previousCompareDiff = await factory.ScreenshotDiff.create({
      buildId: previousBuild.id,
      compareScreenshotId: previousCompareScreenshot.id,
      baseScreenshotId: null,
      fingerprint: null,
      fileId: null,
    });
    const previousBaseDiff = await factory.ScreenshotDiff.create({
      buildId: previousBuild.id,
      baseScreenshotId: previousBaseScreenshot.id,
      compareScreenshotId: null,
      fingerprint: null,
      fileId: null,
    });
    const buildReview = await factory.BuildReview.create({
      buildId: previousBuild.id,
      state: "approved",
    });
    await factory.ScreenshotDiffReview.createMany(2, [
      {
        buildReviewId: buildReview.id,
        screenshotDiffId: previousCompareDiff.id,
        state: "approved",
      },
      {
        buildReviewId: buildReview.id,
        screenshotDiffId: previousBaseDiff.id,
        state: "approved",
      },
    ]);
    const currentCompareScreenshot = await factory.Screenshot.create({
      fileId: compareFile.id,
    });
    const currentBaseScreenshot = await factory.Screenshot.create({
      fileId: baseFile.id,
    });
    const currentCompareDiff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      compareScreenshotId: currentCompareScreenshot.id,
      baseScreenshotId: null,
      fingerprint: null,
      fileId: null,
    });
    const currentBaseDiff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: currentBaseScreenshot.id,
      compareScreenshotId: null,
      fingerprint: null,
      fileId: null,
    });
    await factory.ScreenshotDiff.create({
      buildId: build.id,
    });

    const diffIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
    });
    expect(diffIds.sort()).toEqual(
      [currentCompareDiff.id, currentBaseDiff.id].sort(),
    );
  });

  test("ignores approvals for ignored changes", async ({
    project,
    previousBuild,
    build,
    compareBucket,
  }) => {
    const testModel = await factory.Test.create({
      projectId: project.id,
    });
    const fingerprint = "fp-ignore";
    const diffFile = await factory.File.create({
      type: "screenshotDiff",
      fingerprint,
    });
    const previousScreenshot = await factory.Screenshot.create({
      testId: testModel.id,
    });
    const previousDiff = await factory.ScreenshotDiff.create({
      buildId: previousBuild.id,
      compareScreenshotId: previousScreenshot.id,
      fileId: diffFile.id,
      fingerprint,
      testId: testModel.id,
    });
    await previousDiff.$query().patch({
      fileId: diffFile.id,
      fingerprint,
      testId: testModel.id,
    });
    const buildReview = await factory.BuildReview.create({
      buildId: previousBuild.id,
      state: "approved",
    });
    await factory.ScreenshotDiffReview.create({
      buildReviewId: buildReview.id,
      screenshotDiffId: previousDiff.id,
      state: "approved",
    });
    await IgnoredChange.query().insert({
      projectId: project.id,
      testId: testModel.id,
      fingerprint,
    });
    const currentScreenshot = await factory.Screenshot.create({
      testId: testModel.id,
    });
    const currentDiff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      compareScreenshotId: currentScreenshot.id,
      fileId: diffFile.id,
      fingerprint,
      testId: testModel.id,
    });
    await currentDiff.$query().patch({
      fileId: diffFile.id,
      fingerprint,
      testId: testModel.id,
    });

    const diffIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
    });
    expect(diffIds).toEqual([]);
  });

  test("filters approvals by user id", async ({
    previousBuild,
    build,
    compareBucket,
  }) => {
    const approvingUser = await factory.User.create();
    const otherUser = await factory.User.create();
    const fingerprint = "fp-user";
    const previousScreenshot = await factory.Screenshot.create();
    const previousDiff = await factory.ScreenshotDiff.create({
      buildId: previousBuild.id,
      compareScreenshotId: previousScreenshot.id,
      fingerprint,
    });
    const buildReview = await factory.BuildReview.create({
      buildId: previousBuild.id,
      state: "approved",
      userId: approvingUser.id,
    });
    await factory.ScreenshotDiffReview.create({
      buildReviewId: buildReview.id,
      screenshotDiffId: previousDiff.id,
      state: "approved",
    });
    const currentScreenshot = await factory.Screenshot.create();
    const currentDiff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      compareScreenshotId: currentScreenshot.id,
      fingerprint,
    });

    const filteredIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
      userId: otherUser.id,
    });
    expect(filteredIds).toEqual([]);
    const matchingIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
      userId: approvingUser.id,
    });
    expect(matchingIds).toEqual([currentDiff.id]);
  });
});
