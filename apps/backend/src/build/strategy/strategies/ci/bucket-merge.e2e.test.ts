import { test as baseTest, beforeEach, describe, expect } from "vitest";

import type { Build, Project, ScreenshotBucket, Test } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { mergeBucketWithBuildDiffs } from "./bucket-merge";

type Fixtures = {
  project: Project;
  compareBucket: ScreenshotBucket;
  headBuild: Build;
  sharedTest: Test;
};

const test = baseTest.extend<Fixtures>({
  project: async ({}, use) => {
    await use(await factory.Project.create());
  },
  compareBucket: async ({ project }, use) => {
    await use(
      await factory.ScreenshotBucket.create({
        projectId: project.id,
      }),
    );
  },
  headBuild: async ({ project, compareBucket }, use) => {
    await use(
      await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareBucket.id,
      }),
    );
  },
  sharedTest: async ({ project }, use) => {
    await use(await factory.Test.create({ projectId: project.id }));
  },
});

describe("#mergeBucketWithBuildDiffs", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("merges the base bucket screenshots with the build diffs", async ({
    project,
    compareBucket,
    headBuild,
    sharedTest,
  }) => {
    const baseBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });

    const [screenshotToReplace, screenshotToRemove, untouchedScreenshot] =
      await Promise.all([
        factory.Screenshot.create({
          screenshotBucketId: baseBucket.id,
          testId: sharedTest.id,
          name: "old-home.png",
          baseName: "home.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: baseBucket.id,
          testId: sharedTest.id,
          name: "obsolete.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: baseBucket.id,
          testId: sharedTest.id,
          name: "untouched.png",
        }),
      ]);

    const [replacementScreenshot, addedScreenshot] = await Promise.all([
      factory.Screenshot.create({
        screenshotBucketId: compareBucket.id,
        testId: sharedTest.id,
        name: "new-home.png",
        baseName: "home.png",
      }),
      factory.Screenshot.create({
        screenshotBucketId: compareBucket.id,
        testId: sharedTest.id,
        name: "changelog.png",
      }),
    ]);

    await Promise.all([
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: screenshotToReplace.id,
        compareScreenshotId: replacementScreenshot.id,
        score: 0.5,
        ignored: false,
      }),
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: screenshotToRemove.id,
        compareScreenshotId: null,
        score: 0,
      }),
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: null,
        compareScreenshotId: addedScreenshot.id,
        score: 0,
      }),
    ]);

    const result = await mergeBucketWithBuildDiffs(baseBucket, headBuild);
    const resultIds = result.screenshots.map((screenshot) => screenshot.id);

    expect(resultIds).toContain(untouchedScreenshot.id);
    expect(resultIds).toContain(replacementScreenshot.id);
    expect(resultIds).toContain(addedScreenshot.id);
    expect(resultIds).not.toContain(screenshotToReplace.id);
    expect(resultIds).not.toContain(screenshotToRemove.id);
    expect(
      result.screenshots.map((screenshot) => screenshot.name).sort(),
    ).toEqual(["changelog.png", "new-home.png", "untouched.png"].sort());
  });

  test("merges build diffs when the base bucket is virtual", async ({
    compareBucket,
    headBuild,
    sharedTest,
  }) => {
    const [screenshotToReplace, screenshotToRemove, untouchedScreenshot] =
      await Promise.all([
        factory.Screenshot.create({
          screenshotBucketId: compareBucket.id,
          testId: sharedTest.id,
          name: "old-home.png",
          baseName: "home.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: compareBucket.id,
          testId: sharedTest.id,
          name: "obsolete.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: compareBucket.id,
          testId: sharedTest.id,
          name: "untouched.png",
        }),
      ]);

    const [replacementScreenshot, addedScreenshot] = await Promise.all([
      factory.Screenshot.create({
        screenshotBucketId: compareBucket.id,
        testId: sharedTest.id,
        name: "new-home.png",
        baseName: "home.png",
      }),
      factory.Screenshot.create({
        screenshotBucketId: compareBucket.id,
        testId: sharedTest.id,
        name: "changelog.png",
      }),
    ]);

    await Promise.all([
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: screenshotToReplace.id,
        compareScreenshotId: replacementScreenshot.id,
        score: 0.5,
        ignored: false,
      }),
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: screenshotToRemove.id,
        compareScreenshotId: null,
        score: 0,
      }),
      factory.ScreenshotDiff.create({
        buildId: headBuild.id,
        baseScreenshotId: null,
        compareScreenshotId: addedScreenshot.id,
        score: 0,
      }),
    ]);

    const result = await mergeBucketWithBuildDiffs(
      {
        screenshots: [
          screenshotToReplace,
          screenshotToRemove,
          untouchedScreenshot,
        ],
      },
      headBuild,
    );

    const resultIds = result.screenshots.map((screenshot) => screenshot.id);

    expect(resultIds).toContain(untouchedScreenshot.id);
    expect(resultIds).toContain(replacementScreenshot.id);
    expect(resultIds).toContain(addedScreenshot.id);
    expect(resultIds).not.toContain(screenshotToReplace.id);
    expect(resultIds).not.toContain(screenshotToRemove.id);
    expect(
      result.screenshots.map((screenshot) => screenshot.name).sort(),
    ).toEqual(["changelog.png", "new-home.png", "untouched.png"].sort());
  });
});
