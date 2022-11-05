import { setTimeout as delay } from "node:timers/promises";

import {
  Build,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@argos-ci/database/models";
import type { File, Repository } from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";
import { quitAmqp } from "@argos-ci/job-core";

import { createBuildDiffs } from "./createBuildDiffs.js";

describe("#createBuildDiffs", () => {
  useDatabase();

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  let build: Build;
  let compareBucket: ScreenshotBucket;
  let newScreenshot: Screenshot | undefined;
  let newScreenshotWithoutFile: Screenshot | undefined;
  let repository: Repository;
  let files: File[];

  beforeEach(async () => {
    repository = await factory.create<Repository>("Repository");
    compareBucket = await factory.create<ScreenshotBucket>("ScreenshotBucket", {
      branch: "BUGS-123",
      repositoryId: repository.id,
    });
    build = await factory.create<Build>("Build", {
      baseScreenshotBucketId: null,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
      jobStatus: "pending",
    });
    files = await factory.createMany<File>("File", 10);
    [newScreenshot, newScreenshotWithoutFile] =
      await factory.createMany<Screenshot>("Screenshot", [
        {
          name: "new-screenshot",
          s3Id: "s3Id-a",
          fileId: files[1]!.id,
          screenshotBucketId: compareBucket.id,
        },
        {
          name: "new-screenshot",
          s3Id: "s3Id-b",
          screenshotBucketId: compareBucket.id,
        },
      ]);
  });

  describe("with base bucket", () => {
    let baseBucket: ScreenshotBucket;
    let classicDiffBaseScreenshot: Screenshot | undefined;
    let classicDiffCompareScreenshot: Screenshot | undefined;
    let removedScreenshot: Screenshot | undefined;
    let noFileBaseScreenshotBase: Screenshot | undefined;
    let noFileBaseScreenshotCompare: Screenshot | undefined;
    let noFileCompareScreenshotBase: Screenshot | undefined;
    let noFileCompareScreenshotCompare: Screenshot | undefined;
    let sameFileScreenshotBase: Screenshot | undefined;
    let sameFileScreenshotCompare: Screenshot | undefined;

    beforeEach(async () => {
      baseBucket = await factory.create<ScreenshotBucket>("ScreenshotBucket", {
        branch: "master",
        repositoryId: repository.id,
      });
      await build.$query().patch({ baseScreenshotBucketId: baseBucket.id });
      // @ts-ignore
      [
        classicDiffBaseScreenshot,
        classicDiffCompareScreenshot,
        removedScreenshot,
        noFileBaseScreenshotBase,
        noFileBaseScreenshotCompare,
        noFileCompareScreenshotBase,
        noFileCompareScreenshotCompare,
        sameFileScreenshotBase,
        sameFileScreenshotCompare,
      ] = await factory.createMany<Screenshot>("Screenshot", [
        {
          name: "classic-diff",
          s3Id: "s3Id-c",
          fileId: files[2]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "classic-diff",
          s3Id: "s3Id-d",
          fileId: files[3]!.id,
          screenshotBucketId: compareBucket.id,
        },
        {
          name: "removed-screenshot",
          s3Id: "s3Id-e",
          fileId: files[4]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "no-file-base-screenshot",
          s3Id: "s3Id-f",
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "no-file-base-screenshot",
          s3Id: "s3Id-g",
          fileId: files[5]!.id,
          screenshotBucketId: compareBucket.id,
        },
        {
          name: "no-file-compare-screenshot",
          s3Id: "s3Id-h",
          fileId: files[6]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "no-file-compare-screenshot",
          s3Id: "s3Id-i",
          screenshotBucketId: compareBucket.id,
        },
        {
          name: "same-file",
          s3Id: "s3Id-j",
          fileId: files[7]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "same-file",
          s3Id: "s3Id-j",
          fileId: files[7]!.id,
          screenshotBucketId: compareBucket.id,
        },
      ]);
    });

    it("should return the diffs", async () => {
      const diffs = await createBuildDiffs(build);
      const [
        addedDiff,
        addDiffWithoutFile,
        updatedDiff,
        noFileBaseScreenshotDiff,
        noFileCompareScreenshotDiff,
        sameFileDiff,
        removedDiff,
      ] = diffs;

      expect(diffs.length).toBe(7);
      expect(addedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshot!.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
      expect(addDiffWithoutFile).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
      });
      expect(updatedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: classicDiffBaseScreenshot!.id,
        compareScreenshotId: classicDiffCompareScreenshot!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
      });
      expect(removedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: removedScreenshot!.id,
        compareScreenshotId: null,
        jobStatus: "complete",
        validationStatus: "unknown",
        score: null,
      });
      expect(noFileBaseScreenshotDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: noFileBaseScreenshotBase!.id,
        compareScreenshotId: noFileBaseScreenshotCompare!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        score: null,
      });
      expect(noFileCompareScreenshotDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: noFileCompareScreenshotBase!.id,
        compareScreenshotId: noFileCompareScreenshotCompare!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        score: null,
      });
      expect(sameFileDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: sameFileScreenshotBase!.id,
        compareScreenshotId: sameFileScreenshotCompare!.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
    });

    it("should compare only when file's dimensions is missing", async () => {
      await compareBucket.$query().patch({ commit: baseBucket.commit });

      const [
        addedDiff,
        addDiffWithoutFile,
        updatedDiff,
        noFileBaseScreenshotDiff,
        noFileCompareScreenshotDiff,
        sameFileDiff,
        removedDiff,
      ] = await createBuildDiffs(build);
      const getJobStatuses = (diffs: ScreenshotDiff[]) => [
        ...new Set(diffs.map((diff: ScreenshotDiff) => diff.jobStatus)),
      ];

      expect(
        getJobStatuses([addedDiff!, updatedDiff!, sameFileDiff!, removedDiff!])
      ).toMatchObject(["complete"]);
      expect(
        getJobStatuses([
          addDiffWithoutFile!,
          noFileBaseScreenshotDiff!,
          noFileCompareScreenshotDiff!,
        ])
      ).toMatchObject(["pending"]);
    });

    describe("when compare branch equal reference branch", () => {
      beforeEach(async () => {
        await ScreenshotBucket.query().findById(compareBucket.id).patch({
          branch: repository.referenceBranch,
        });
      });

      it("should update build type to 'reference'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild.type).toBe("reference");
      });
    });

    describe("with compare branch different than reference branch", () => {
      it("should update build type to 'check'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild.type).toBe("check");
      });
    });
  });

  describe("without base bucket", () => {
    it("should work with a first build", async () => {
      const diffs = await createBuildDiffs(build);
      expect(diffs.length).toBe(2);
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshot!.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
      });
    });

    it("should update build type to 'orphan'", async () => {
      await createBuildDiffs(build);
      const updatedBuild = await Build.query().findById(build.id);
      expect(updatedBuild.type).toBe("orphan");
    });
  });
});
