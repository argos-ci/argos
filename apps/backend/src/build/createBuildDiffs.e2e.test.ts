import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import {
  Build,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@/database/models";
import type { File, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createBuildDiffs } from "./createBuildDiffs";

describe("#createBuildDiffs", () => {
  let build: Build;
  let compareBucket: ScreenshotBucket;
  let newScreenshot: Screenshot | undefined;
  let newScreenshotWithoutFile: Screenshot | undefined;
  let project: Project;
  let files: File[];

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      githubRepositoryId: null,
    });
    compareBucket = await factory.ScreenshotBucket.create({
      branch: "BUGS-123",
      projectId: project.id,
    });
    build = await factory.Build.create({
      baseScreenshotBucketId: null,
      compareScreenshotBucketId: compareBucket.id,
      projectId: project.id,
      jobStatus: "pending",
      conclusion: null,
    });
    files = await factory.File.createMany(10, {
      type: "screenshot",
    });
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

  describe("with base bucket", () => {
    let baseBucket: ScreenshotBucket;
    let screenshots: Screenshot[];
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
      screenshots = await factory.Screenshot.createMany(9, [
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
      ] = screenshots;
    });

    it("should return the diffs", async () => {
      const diffs = await createBuildDiffs(build);
      const findByCompareId = (compareScreenshotId: string) =>
        diffs.find((diff) => diff.compareScreenshotId === compareScreenshotId);
      const findByBaseId = (baseScreenshotId: string) =>
        diffs.find((diff) => diff.baseScreenshotId === baseScreenshotId);
      const addedDiff = findByCompareId(newScreenshot!.id);
      const addDiffWithoutFile = findByCompareId(newScreenshotWithoutFile!.id);
      const updatedDiff = diffs.find(
        (diff) =>
          diff.baseScreenshotId === classicDiffBaseScreenshot!.id &&
          diff.compareScreenshotId === classicDiffCompareScreenshot!.id,
      );
      const noFileBaseScreenshotDiff = diffs.find(
        (diff) =>
          diff.baseScreenshotId === noFileBaseScreenshotBase!.id &&
          diff.compareScreenshotId === noFileBaseScreenshotCompare!.id,
      );
      const noFileCompareScreenshotDiff = diffs.find(
        (diff) =>
          diff.baseScreenshotId === noFileCompareScreenshotBase!.id &&
          diff.compareScreenshotId === noFileCompareScreenshotCompare!.id,
      );
      const sameFileDiff = diffs.find(
        (diff) =>
          diff.baseScreenshotId === sameFileScreenshotBase!.id &&
          diff.compareScreenshotId === sameFileScreenshotCompare!.id,
      );
      const removedDiff = findByBaseId(removedScreenshot!.id);

      expect(diffs.length).toBe(7);
      expect(addedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshot!.id,
        jobStatus: "complete",
      });
      expect(addDiffWithoutFile).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
      });
      expect(updatedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: classicDiffBaseScreenshot!.id,
        compareScreenshotId: classicDiffCompareScreenshot!.id,
        jobStatus: "pending",
      });
      expect(removedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: removedScreenshot!.id,
        compareScreenshotId: null,
        jobStatus: "complete",
        score: null,
      });
      expect(noFileBaseScreenshotDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: noFileBaseScreenshotBase!.id,
        compareScreenshotId: noFileBaseScreenshotCompare!.id,
        jobStatus: "pending",
        score: null,
      });
      expect(noFileCompareScreenshotDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: noFileCompareScreenshotBase!.id,
        compareScreenshotId: noFileCompareScreenshotCompare!.id,
        jobStatus: "pending",
        score: null,
      });
      expect(sameFileDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: sameFileScreenshotBase!.id,
        compareScreenshotId: sameFileScreenshotCompare!.id,
        jobStatus: "complete",
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

    describe("when compare branch that matches auto-approved branch glob", () => {
      beforeEach(async () => {
        const autoApprovedBranchGlob =
          await project.$getAutoApprovedBranchGlob();
        invariant(autoApprovedBranchGlob);
        await ScreenshotBucket.query().findById(compareBucket.id).patch({
          branch: autoApprovedBranchGlob,
        });
      });

      it("should update build type to 'reference'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("reference");
      });
    });

    describe("with compare branch different than auto-approved branch", () => {
      it("should update build type to 'check'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild?.type).toBe("check");
      });
    });
  });

  describe("with base name candidates", () => {
    let baseBucket: ScreenshotBucket;

    beforeEach(async () => {
      baseBucket = await factory.ScreenshotBucket.create({
        branch: "master",
        projectId: project.id,
      });
      await build
        .$query()
        .patchAndFetch({ baseScreenshotBucketId: baseBucket.id });
    });

    it("falls back to the next candidate when the first one is missing", async () => {
      const [base, compare] = await factory.Screenshot.createMany(2, [
        {
          name: "home.png",
          s3Id: "s3Id-home",
          fileId: files[2]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "home-variant-b.png",
          s3Id: "s3Id-home-variant-b",
          fileId: files[3]!.id,
          screenshotBucketId: compareBucket.id,
          baseNames: ["home-variant-b.png", "home.png"],
        },
      ]);
      invariant(base && compare);

      const diffs = await createBuildDiffs(build);
      const diff = diffs.find((d) => d.compareScreenshotId === compare.id);

      expect(diff).toMatchObject({ baseScreenshotId: base.id });
    });

    it("prefers the first candidate present in the baseline", async () => {
      const [exactBase, fallbackBase, compare] =
        await factory.Screenshot.createMany(3, [
          {
            name: "home-variant-b.png",
            s3Id: "s3Id-exact",
            fileId: files[2]!.id,
            screenshotBucketId: baseBucket.id,
          },
          {
            name: "home.png",
            s3Id: "s3Id-fallback",
            fileId: files[3]!.id,
            screenshotBucketId: baseBucket.id,
          },
          {
            name: "home-variant-b.png",
            s3Id: "s3Id-compare",
            fileId: files[4]!.id,
            screenshotBucketId: compareBucket.id,
            baseNames: ["home-variant-b.png", "home.png"],
          },
        ]);
      invariant(exactBase && fallbackBase && compare);

      const diffs = await createBuildDiffs(build);
      const diff = diffs.find((d) => d.compareScreenshotId === compare.id);

      expect(diff).toMatchObject({ baseScreenshotId: exactBase.id });
    });

    it("does not mark a baseline reached through a fallback as removed", async () => {
      const [base, compare] = await factory.Screenshot.createMany(2, [
        {
          name: "home.png",
          s3Id: "s3Id-home",
          fileId: files[2]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "home-variant-b.png",
          s3Id: "s3Id-home-variant-b",
          fileId: files[3]!.id,
          screenshotBucketId: compareBucket.id,
          baseNames: ["home-variant-b.png", "home.png"],
        },
      ]);
      invariant(base && compare);

      const diffs = await createBuildDiffs(build);
      const removedDiff = diffs.find(
        (d) => d.baseScreenshotId === base.id && d.compareScreenshotId === null,
      );

      expect(removedDiff).toBeUndefined();
    });

    it("creates a diff per screenshot sharing the same fallback baseline", async () => {
      const [base, firstCompare, secondCompare] =
        await factory.Screenshot.createMany(3, [
          {
            name: "home.png",
            s3Id: "s3Id-home",
            fileId: files[2]!.id,
            screenshotBucketId: baseBucket.id,
          },
          {
            name: "home-variant-b.png",
            s3Id: "s3Id-home-variant-b",
            fileId: files[3]!.id,
            screenshotBucketId: compareBucket.id,
            baseNames: ["home-variant-b.png", "home.png"],
          },
          {
            name: "home-variant-c.png",
            s3Id: "s3Id-home-variant-c",
            fileId: files[4]!.id,
            screenshotBucketId: compareBucket.id,
            baseNames: ["home-variant-c.png", "home.png"],
          },
        ]);
      invariant(base && firstCompare && secondCompare);

      const diffs = await createBuildDiffs(build);

      expect(
        diffs.find((d) => d.compareScreenshotId === firstCompare.id),
      ).toMatchObject({ baseScreenshotId: base.id });
      expect(
        diffs.find((d) => d.compareScreenshotId === secondCompare.id),
      ).toMatchObject({ baseScreenshotId: base.id });
    });

    it("still honors the legacy `baseName` column", async () => {
      const [base, compare] = await factory.Screenshot.createMany(2, [
        {
          name: "home.png",
          s3Id: "s3Id-home",
          fileId: files[2]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "home repeat-2.png",
          s3Id: "s3Id-repeat",
          fileId: files[3]!.id,
          screenshotBucketId: compareBucket.id,
          baseName: "home.png",
        },
      ]);
      invariant(base && compare);

      const diffs = await createBuildDiffs(build);
      const diff = diffs.find((d) => d.compareScreenshotId === compare.id);

      expect(diff).toMatchObject({ baseScreenshotId: base.id });
    });

    it("reports a baseline no compare screenshot points at as removed", async () => {
      const [base, compare] = await factory.Screenshot.createMany(2, [
        {
          name: "gone.png",
          s3Id: "s3Id-gone",
          fileId: files[2]!.id,
          screenshotBucketId: baseBucket.id,
        },
        {
          name: "home-variant-b.png",
          s3Id: "s3Id-home-variant-b",
          fileId: files[3]!.id,
          screenshotBucketId: compareBucket.id,
          baseNames: ["home-variant-b.png", "home.png"],
        },
      ]);
      invariant(base && compare);

      const diffs = await createBuildDiffs(build);

      expect(
        diffs.find(
          (d) =>
            d.baseScreenshotId === base.id && d.compareScreenshotId === null,
        ),
      ).toBeDefined();
      // No candidate matched, so it is a brand new screenshot.
      expect(
        diffs.find((d) => d.compareScreenshotId === compare.id),
      ).toMatchObject({ baseScreenshotId: null });
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
      });
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: newScreenshotWithoutFile!.id,
        jobStatus: "pending",
      });
    });

    it("should update build type to 'orphan'", async () => {
      await createBuildDiffs(build);
      const updatedBuild = await Build.query().findById(build.id);
      expect(updatedBuild?.type).toBe("orphan");
    });
  });
});
