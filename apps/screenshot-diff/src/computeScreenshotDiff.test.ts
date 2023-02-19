import { jest } from "@jest/globals";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import config from "@argos-ci/config";
import {
  Build,
  Repository,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";
import { quitAmqp } from "@argos-ci/job-core";
import { s3 as getS3, upload } from "@argos-ci/storage";
import type { S3Client } from "@argos-ci/storage";

import {
  computeScreenshotDiff,
  getStabilityScore,
} from "./computeScreenshotDiff.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#computeScreenshotDiff", () => {
  useDatabase();
  jest.setTimeout(10000);

  let s3: S3Client;
  let baseBucket: ScreenshotBucket;
  let build: Build;
  let compareBucket: ScreenshotBucket;
  let screenshotDiff: ScreenshotDiff;
  let repository: Repository;

  beforeAll(async () => {
    s3 = getS3();
    await upload({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope.png",
      inputPath: join(__dirname, "__fixtures__", "penelope.png"),
    });
    await upload({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope-argos.png",
      inputPath: join(__dirname, "__fixtures__", "penelope-argos.png"),
    });
  });

  beforeEach(async () => {
    repository = await factory.create<Repository>("Repository", {
      token: "xx",
    });
    compareBucket = await factory.create<ScreenshotBucket>("ScreenshotBucket", {
      name: "test-bucket",
      branch: "test-branch",
      repositoryId: repository.id,
    });
    baseBucket = await factory.create<ScreenshotBucket>("ScreenshotBucket", {
      name: "base-bucket",
      branch: "master",
      repositoryId: repository.id,
    });
    build = await factory.create<Build>("Build", {
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
    });
  });

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("#getStabilityScore", () => {
    const currentBranch = "test-branch";
    const screenshotName = "checkout-mobile.png";
    let builds: Array<Build>;
    let unchangedScreenshotDiff: any;
    let changedScreenshotDiff: any;

    beforeEach(async () => {
      builds = await factory.createMany<Build>("Build", 15, {
        repositoryId: repository.id,
      });

      const compareScreenshotBuckets = await ScreenshotBucket.query().whereIn(
        "id",
        builds.map(({ compareScreenshotBucketId }) => compareScreenshotBucketId)
      );

      const [, screenshot] = await Promise.all([
        compareScreenshotBuckets.map(
          async (compareScreenshotBucket, bucketIndex) =>
            ScreenshotBucket.query()
              .patch({
                branch: `feature-branch-${Math.min(bucketIndex + 1, 9)}`,
              })
              .findById(compareScreenshotBucket.id)
        ),
        await factory.create<Screenshot>("Screenshot", {
          name: screenshotName,
        }),
      ]);

      unchangedScreenshotDiff = {
        compareScreenshotId: screenshot.id,
        score: 0,
      };
      changedScreenshotDiff = { ...unchangedScreenshotDiff, score: 0.3 };

      await factory.createMany<ScreenshotDiff>("ScreenshotDiff", [
        { buildId: build.id, ...changedScreenshotDiff },
        { buildId: builds[0]!.id, ...unchangedScreenshotDiff },
        { buildId: builds[1]!.id, ...unchangedScreenshotDiff },
        { buildId: builds[2]!.id, ...unchangedScreenshotDiff },
        { buildId: builds[3]!.id, ...unchangedScreenshotDiff },
        { buildId: builds[4]!.id, ...unchangedScreenshotDiff },
      ]);
    });

    it("returns score of a never updated screenshot", async () => {
      const stabilityScore = await getStabilityScore({
        screenshotName,
        currentBranch,
        repositoryId: repository.id,
      });

      // totalBuildWithChanges: 0,
      // totalBuilds: 15,
      // totalBranchesWithChanges: 0,
      // totalBranches: 9

      expect(stabilityScore).toBe(100);
    });

    it("returns score of a screenshot updated several times in a branch", async () => {
      await factory.createMany<ScreenshotDiff>("ScreenshotDiff", [
        { buildId: builds[10]!.id, ...changedScreenshotDiff },
        { buildId: builds[11]!.id, ...changedScreenshotDiff },
        { buildId: builds[12]!.id, ...changedScreenshotDiff },
        { buildId: builds[14]!.id, ...changedScreenshotDiff },
      ]);

      const stabilityScore = await getStabilityScore({
        screenshotName,
        currentBranch,
        repositoryId: repository.id,
      });

      // totalBuildWithChanges: 4,
      // totalBuilds: 15,
      // totalBranchesWithChanges: 1,
      // totalBranches: 9

      expect(stabilityScore).toBe(65);
    });

    it("returns score of a flaky screenshot", async () => {
      await factory.createMany<ScreenshotDiff>("ScreenshotDiff", [
        { buildId: builds[5]!.id, ...changedScreenshotDiff },
        { buildId: builds[6]!.id, ...changedScreenshotDiff },
        { buildId: builds[7]!.id, ...changedScreenshotDiff },
        { buildId: builds[8]!.id, ...changedScreenshotDiff },
        { buildId: builds[9]!.id, ...changedScreenshotDiff },
      ]);

      const stabilityScore = await getStabilityScore({
        screenshotName,
        currentBranch,
        repositoryId: repository.id,
      });

      // totalBuildWithChanges: 5,
      // totalBuilds: 15,
      // totalBranchesWithChanges: 4,
      // totalBranches: 9

      expect(stabilityScore).toBe(37);
    });
  });

  describe("with two different screenshots", () => {
    beforeEach(async () => {
      const compareScreenshot = await factory.create<Screenshot>("Screenshot", {
        name: "penelope",
        s3Id: "penelope-argos.png",
        screenshotBucketId: compareBucket.id,
      });
      const baseScreenshot = await factory.create<Screenshot>("Screenshot", {
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: baseBucket.id,
      });
      screenshotDiff = await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: "pending",
        validationStatus: "unknown",
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
  });

  describe("with two same screenshots", () => {
    beforeEach(async () => {
      const compareScreenshot = await factory.create<Screenshot>("Screenshot", {
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: compareBucket.id,
      });
      const baseScreenshot = await factory.create<Screenshot>("Screenshot", {
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: baseBucket.id,
      });
      screenshotDiff = await factory.create<ScreenshotDiff>("ScreenshotDiff", {
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
