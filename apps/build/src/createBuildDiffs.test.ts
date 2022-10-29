import { sortBy } from "lodash-es";
import { setTimeout as delay } from "node:timers/promises";

import { Build, Screenshot, ScreenshotBucket } from "@argos-ci/database/models";
import type { File, Repository } from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";
import { quitAmqp } from "@argos-ci/job-core";

import { createBuildDiffs } from "./createBuildDiffs.js";

describe("createBuildDiffs", () => {
  useDatabase();

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  let build: Build;
  let compareBucket: ScreenshotBucket;
  let baseBucket: ScreenshotBucket;
  let compareScreenshot1: Screenshot;
  let baseScreenshot: Screenshot;
  let repository: Repository;

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
    compareScreenshot1 = await factory.create<Screenshot>("Screenshot", {
      name: "b",
      s3Id: "b",
      screenshotBucketId: compareBucket.id,
    });
  });

  describe("with existing base screenshot bucket", () => {
    let compareScreenshot2: Screenshot;
    let removedScreenshot: Screenshot;

    beforeEach(async () => {
      baseBucket = await factory.create<ScreenshotBucket>("ScreenshotBucket", {
        branch: "master",
        repositoryId: repository.id,
      });
      // @ts-ignore
      [baseScreenshot, compareScreenshot2, removedScreenshot] =
        await factory.createMany<Screenshot>("Screenshot", [
          { name: "a", s3Id: "a", screenshotBucketId: baseBucket.id },
          { name: "a", s3Id: "a", screenshotBucketId: compareBucket.id },
          {
            name: "removed-screenshot",
            s3Id: "a",
            screenshotBucketId: baseBucket.id,
          },
        ]);
    });

    it("should return the diffs", async () => {
      const diffs = await createBuildDiffs(build);
      const [addedDiff, updatedDiff, removedDiff] = diffs.sort(
        (a, b) => Number(a.id) - Number(b.id)
      );

      expect(diffs.length).toBe(3);
      expect(addedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot1.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
      expect(updatedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot2.id,
        jobStatus: "pending",
        validationStatus: "unknown",
      });
      expect(removedDiff).toMatchObject({
        buildId: build.id,
        baseScreenshotId: removedScreenshot.id,
        compareScreenshotId: null,
        jobStatus: "complete",
        validationStatus: "unknown",
        score: null,
      });
    });

    describe("with matching compareScreenshotBucket branch and reference branch", () => {
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

    describe("with compareScreenshotBucket branch doesn't match reference branch", () => {
      it("should update build type to 'check'", async () => {
        await createBuildDiffs(build);
        const updatedBuild = await Build.query().findById(build.id);
        expect(updatedBuild.type).toBe("check");
      });
    });

    describe("with two screenshots with the same fileId", () => {
      beforeEach(async () => {
        const file = await factory.create<File>("File", { key: "file-key" });
        await Screenshot.query()
          .findByIds([baseScreenshot.id, compareScreenshot2.id])
          .patch({ s3Id: "file-key", fileId: file.id });
      });

      it("puts a score of 0 and mark the jobStatus as complete", async () => {
        const diffs = sortBy(await createBuildDiffs(build), (diff) =>
          Number(diff.baseScreenshotId)
        );
        expect(diffs.length).toBe(3);
        expect(diffs[0]).toMatchObject({
          buildId: build.id,
          baseScreenshotId: null,
          compareScreenshotId: compareScreenshot1.id,
          score: null,
          jobStatus: "complete",
          validationStatus: "unknown",
        });
        expect(diffs[1]).toMatchObject({
          buildId: build.id,
          baseScreenshotId: baseScreenshot.id,
          compareScreenshotId: compareScreenshot2.id,
          score: 0,
          jobStatus: "complete",
          validationStatus: "unknown",
        });
      });
    });

    it("should not run the diff when comparing the base branch against itself", async () => {
      await compareBucket.$query().patch({ commit: baseBucket.commit });
      const diffs = sortBy(await createBuildDiffs(build), (diff) =>
        Number(diff.baseScreenshotId)
      );
      expect(diffs.length).toBe(3);
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot1.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot2.id,
        jobStatus: "complete",
        validationStatus: "unknown",
      });
    });
  });

  describe("without base screenshot bucket", () => {
    it("should work with a first build", async () => {
      const diffs = await createBuildDiffs(build);
      expect(diffs.length).toBe(1);
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot1.id,
        jobStatus: "complete",
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
