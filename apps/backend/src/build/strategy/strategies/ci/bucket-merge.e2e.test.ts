import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { mergeBucketWithBuildDiffs } from "./bucket-merge";

describe("#mergeBucketWithBuildDiffs", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("merges the base bucket screenshots with the build diffs", async () => {
    const project = await factory.Project.create();
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        { projectId: project.id },
        { projectId: project.id },
      ]);
    invariant(baseBucket && compareBucket);
    const [headBuild, sharedTest] = await Promise.all([
      factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareBucket!.id,
      }),
      factory.Test.create({ projectId: project.id }),
    ]);

    const [screenshotToReplace, screenshotToRemove, untouchedScreenshot] =
      await Promise.all([
        factory.Screenshot.create({
          screenshotBucketId: baseBucket!.id,
          testId: sharedTest.id,
          name: "old-home.png",
          baseName: "home.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: baseBucket!.id,
          testId: sharedTest.id,
          name: "obsolete.png",
        }),
        factory.Screenshot.create({
          screenshotBucketId: baseBucket!.id,
          testId: sharedTest.id,
          name: "untouched.png",
        }),
      ]);

    const [replacementScreenshot, addedScreenshot] = await Promise.all([
      factory.Screenshot.create({
        screenshotBucketId: compareBucket!.id,
        testId: sharedTest.id,
        name: "new-home.png",
        baseName: "home.png",
      }),
      factory.Screenshot.create({
        screenshotBucketId: compareBucket!.id,
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
});
