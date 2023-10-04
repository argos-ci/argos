import { beforeEach, describe, expect, it } from "vitest";

import {
  Build,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@/database/models/index.js";
import type { File, Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createBuildDiffs, getStabilityScores } from "./createBuildDiffs.js";

describe("#createBuildDiffs", () => {
  let build: Build;
  let compareBucket: ScreenshotBucket;
  let newScreenshot: Screenshot | undefined;
  let newScreenshotWithoutFile: Screenshot | undefined;
  let project: Project;
  let files: File[];

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create();
    compareBucket = await factory.ScreenshotBucket.create({
      branch: "BUGS-123",
      projectId: project.id,
    });
    build = await factory.Build.create({
      baseScreenshotBucketId: null,
      compareScreenshotBucketId: compareBucket.id,
      projectId: project.id,
      jobStatus: "pending",
    });
    files = await factory.File.createMany(10);
    [newScreenshot, newScreenshotWithoutFile] =
      await factory.Screenshot.createMany(2, [
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

  describe("#getStabilityScores", () => {
    const screenshotName = "checkout-mobile.png";
    let builds: Array<Build>;
    let screenshot: Screenshot;
    let unchangedScreenshotDiff: any;
    let changedScreenshotDiff: any;

    describe("on a build with low usage (less than 10 builds in a week)", () => {
      beforeEach(async () => {
        const project = await factory.Project.create();
        [builds, screenshot] = await Promise.all([
          factory.Build.createMany(2, {
            projectId: project.id,
          }),
          factory.Screenshot.create({ name: screenshotName }),
        ]);
        unchangedScreenshotDiff = {
          compareScreenshotId: screenshot.id,
          score: 0,
        };
        changedScreenshotDiff = { ...unchangedScreenshotDiff, score: 0.3 };
        await factory.ScreenshotDiff.createMany(2, [
          { buildId: builds[0]!.id, ...unchangedScreenshotDiff },
          { buildId: builds[1]!.id, ...unchangedScreenshotDiff },
        ]);
      });

      it("returns 'undefined' stability score for a never updated screenshot", async () => {
        const stabilityScores = await getStabilityScores({
          buildName: build.name,
          projectId: project.id,
        });
        expect(stabilityScores[screenshotName]).toBeUndefined();
      });

      it("returns always max stability score", async () => {
        await factory.ScreenshotDiff.create({
          buildId: build.id,
          ...changedScreenshotDiff,
        });
        const stabilityScores = await getStabilityScores({
          buildName: build.name,
          projectId: project.id,
        });
        expect(stabilityScores[screenshotName]).toBe(100);
      });
    });

    describe("on a build with high usage (more than 10 builds in a week)", () => {
      beforeEach(async () => {
        const screenshotBuckets = await factory.ScreenshotBucket.createMany(4, [
          { branch: "main" },
          { branch: "feature-branch" },
          { branch: "feature-branch-2" },
          { branch: "feature-branch-3" },
        ]);
        [builds, screenshot] = await Promise.all([
          factory.Build.createMany(8, {
            projectId: project.id,
            compareScreenshotBucketId: screenshotBuckets[0]!.id,
          }),
          factory.Screenshot.create({ name: screenshotName }),
          factory.Build.createMany(3, [
            {
              projectId: project.id,
              compareScreenshotBucketId: screenshotBuckets[1]!.id,
            },
            {
              projectId: project.id,
              compareScreenshotBucketId: screenshotBuckets[2]!.id,
            },
            {
              projectId: project.id,
              compareScreenshotBucketId: screenshotBuckets[3]!.id,
            },
          ]),
        ]);
        unchangedScreenshotDiff = {
          compareScreenshotId: screenshot.id,
          score: 0,
        };
        changedScreenshotDiff = { ...unchangedScreenshotDiff, score: 0.3 };
        await factory.ScreenshotDiff.createMany(2, [
          { buildId: builds[0]!.id, ...unchangedScreenshotDiff },
          { buildId: builds[1]!.id, ...unchangedScreenshotDiff },
        ]);
      });

      it("returns 'undefined' stability score for a never updated screenshot", async () => {
        const stabilityScores = await getStabilityScores({
          buildName: build.name,
          projectId: project.id,
        });
        expect(stabilityScores[screenshotName]).toBeUndefined();
      });

      it("returns high stability score after first screenshot update", async () => {
        await factory.ScreenshotDiff.create({
          buildId: build.id,
          ...changedScreenshotDiff,
        });
        const stabilityScores = await getStabilityScores({
          buildName: build.name,
          projectId: project.id,
        });
        expect(stabilityScores[screenshotName]).toBe(73);
      });

      it("returns low stability score for a flaky screenshot", async () => {
        await factory.ScreenshotDiff.createMany(5, [
          { buildId: builds[3]!.id, ...changedScreenshotDiff },
          { buildId: builds[4]!.id, ...changedScreenshotDiff },
          { buildId: builds[5]!.id, ...changedScreenshotDiff },
          { buildId: builds[6]!.id, ...changedScreenshotDiff },
          { buildId: builds[7]!.id, ...changedScreenshotDiff },
        ]);
        const stabilityScores = await getStabilityScores({
          buildName: build.name,
          projectId: project.id,
        });
        expect(stabilityScores[screenshotName]).toBe(47);
      });
    });
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
      baseBucket = await factory.ScreenshotBucket.create({
        branch: "master",
        projectId: project.id,
      });
      await build
        .$query()
        .patchAndFetch({ baseScreenshotBucketId: baseBucket.id });
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
      ] = await factory.Screenshot.createMany(9, [
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
        stabilityScore: 100,
      });
      expect(addDiffWithoutFile).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        stabilityScore: 100,
      });
      expect(updatedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: classicDiffBaseScreenshot!.id,
        compareScreenshotId: classicDiffCompareScreenshot!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        stabilityScore: 100,
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
        stabilityScore: 100,
      });
      expect(noFileCompareScreenshotDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: noFileCompareScreenshotBase!.id,
        compareScreenshotId: noFileCompareScreenshotCompare!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        score: null,
        stabilityScore: 100,
      });
      expect(sameFileDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: sameFileScreenshotBase!.id,
        compareScreenshotId: sameFileScreenshotCompare!.id,
        jobStatus: "complete",
        validationStatus: "unknown",
        stabilityScore: 100,
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
        getJobStatuses([addedDiff!, sameFileDiff!, removedDiff!]),
      ).toMatchObject(["complete"]);
      expect(
        getJobStatuses([
          updatedDiff!,
          addDiffWithoutFile!,
          noFileBaseScreenshotDiff!,
          noFileCompareScreenshotDiff!,
        ]),
      ).toMatchObject(["pending"]);
    });

    describe("when compare branch equal reference branch", () => {
      beforeEach(async () => {
        const referenceBranch = await project.$getReferenceBranch();
        if (!referenceBranch) {
          throw new Error("Reference branch not found");
        }
        await ScreenshotBucket.query().findById(compareBucket.id).patch({
          branch: referenceBranch,
        });
      });

      it("should update build type to 'reference'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("reference");
      });
    });

    describe("with compare branch different than reference branch", () => {
      it("should update build type to 'check'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("check");
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
        stabilityScore: 100,
      });
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
        validationStatus: "unknown",
        stabilityScore: 100,
      });
    });

    it("should update build type to 'orphan'", async () => {
      await createBuildDiffs(build);
      const updatedBuild = await Build.query().findById(build.id);
      expect(updatedBuild?.type).toBe("orphan");
    });
  });
});
