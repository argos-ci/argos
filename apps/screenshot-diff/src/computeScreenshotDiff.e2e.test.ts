import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import config from "@argos-ci/config";
import {
  Build,
  Project,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
} from "@argos-ci/database/models";
import { factory, setupDatabase } from "@argos-ci/database/testing";
import { quitAmqp } from "@argos-ci/job-core";
import { s3 as getS3, uploadFromFilePath } from "@argos-ci/storage";
import type { S3Client } from "@argos-ci/storage";

import { computeScreenshotDiff } from "./computeScreenshotDiff.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#computeScreenshotDiff", () => {
  let s3: S3Client;
  let baseBucket: ScreenshotBucket;
  let build: Build;
  let compareBucket: ScreenshotBucket;
  let screenshotDiff: ScreenshotDiff;
  let project: Project;

  beforeAll(async () => {
    s3 = getS3();
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope.png",
      inputPath: join(__dirname, "__fixtures__", "penelope.png"),
    });
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope-argos.png",
      inputPath: join(__dirname, "__fixtures__", "penelope-argos.png"),
    });
  });

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      token: "xx",
    });
    const buckets = await factory.ScreenshotBucket.createMany(2, [
      {
        name: "test-bucket",
        branch: "test-branch",
        projectId: project.id,
      },
      {
        name: "base-bucket",
        branch: "master",
        projectId: project.id,
      },
    ]);
    compareBucket = buckets[0]!;
    baseBucket = buckets[1]!;
    build = await factory.Build.create({
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      projectId: project.id,
    });
  });

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("with two different screenshots", () => {
    let test: Test;
    beforeEach(async () => {
      const compareScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope-argos.png",
        screenshotBucketId: compareBucket.id,
      });
      const baseScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: baseBucket.id,
      });
      test = await factory.Test.create({
        name: compareScreenshot.name,
        projectId: project.id,
        buildName: "default",
        status: "pending",
      });
      screenshotDiff = await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        testId: test.id,
      });
    });

    it('should update result and notify "diff-detected"', async () => {
      await computeScreenshotDiff(screenshotDiff, {
        s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.score! > 0).toBe(true);
      expect(typeof screenshotDiff.s3Id === "string").toBe(true);
      // expect(pushBuildNotification).toBeCalledWith({
      //   buildId: build.id,
      //   type: "diff-detected",
      // });
    });

    it('a muted test should notify "no-diff-detected"', async () => {
      await Test.query().patch({ muted: true }).findById(test.id);
      await computeScreenshotDiff(screenshotDiff, {
        s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.score! > 0).toBe(true);
      expect(typeof screenshotDiff.s3Id === "string").toBe(true);
      // expect(pushBuildNotification).toBeCalledWith({
      //   buildId: build.id,
      //   type: "no-diff-detected",
      // });
    });
  });

  describe("with two same screenshots", () => {
    beforeEach(async () => {
      const compareScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: compareBucket.id,
      });
      const baseScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: baseBucket.id,
      });
      screenshotDiff = await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: "pending",
        validationStatus: "unknown",
      });
    });

    it('should not update result and notify "no-diff-detected"', async () => {
      await computeScreenshotDiff(screenshotDiff, {
        s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.score).toBe(0);
      expect(screenshotDiff.s3Id).toBe(null);
      // expect(pushBuildNotification).toBeCalledWith({
      //   buildId: build.id,
      //   type: "no-diff-detected",
      // });
    });
  });
});
