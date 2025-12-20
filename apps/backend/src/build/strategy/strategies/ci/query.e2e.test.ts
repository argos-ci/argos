import { beforeEach, describe, expect, it } from "vitest";

import { Build, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getBaseBucketForBuildAndCommit, getBucketFromCommits } from "./query";

describe("#getBaseBucketForBuildAndCommit", () => {
  describe("when the build is triggered by a pull request", () => {
    let baseBucket: ScreenshotBucket;
    let build: Build;
    let baseBucketBuild: Build;

    beforeEach(async () => {
      await setupDatabase();
      const project = await factory.Project.create();
      const buckets = await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: project.id,
          commit: "e80e8d229a86b17c38e91732c52340fbb0dd9a9f",
        },
        {
          projectId: project.id,
          commit: "ffe0d51d369faa5ec184454b904f17c10f33f0bc",
        },
      ]);
      baseBucket = buckets[0]!;
      const bucket = buckets[1]!;
      const builds = await factory.Build.createMany(2, [
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: baseBucket.id,
          jobStatus: "complete",
          prHeadCommit: "766b744bc5fa27a330283dfd47ffafdaf905a941",
          name: "default",
          projectId: project.id,
          type: "reference",
          mode: "ci",
        },
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: bucket.id,
          jobStatus: "pending",
          prHeadCommit: null,
          name: "default",
          projectId: project.id,
          mode: "ci",
        },
      ]);
      baseBucketBuild = builds[0]!;
      build = builds[1]!;
    });

    describe("if the associated build is pending", () => {
      beforeEach(async () => {
        await baseBucketBuild.$query().patch({ jobStatus: "pending" });
      });

      it("does not returns the bucket", async () => {
        const result = await getBaseBucketForBuildAndCommit(
          build,
          "766b744bc5fa27a330283dfd47ffafdaf905a941",
          { approved: true },
        );
        expect(result).toBeNull();
      });
    });

    describe("if the associated build is a type check without any diff", () => {
      beforeEach(async () => {
        await baseBucketBuild.$query().patch({ type: "check" });
      });

      it("does not returns the bucket", async () => {
        const result = await getBaseBucketForBuildAndCommit(
          build,
          "766b744bc5fa27a330283dfd47ffafdaf905a941",
          { approved: true },
        );
        expect(result).toBeNull();
      });
    });

    describe("if the associated build is a type check with a rejected review", () => {
      beforeEach(async () => {
        await baseBucketBuild.$query().patch({ type: "check" });
        await factory.BuildReview.create({
          buildId: baseBucketBuild.id,
          state: "approved",
        });
        // The last one wins, so it's a rejected build in this case
        await factory.BuildReview.create({
          buildId: baseBucketBuild.id,
          state: "rejected",
        });
      });

      it("does not returns the bucket", async () => {
        const result = await getBaseBucketForBuildAndCommit(
          build,
          "766b744bc5fa27a330283dfd47ffafdaf905a941",
          { approved: true },
        );
        expect(result).toBeNull();
      });
    });

    describe("if the associated build is a type check with approved review", () => {
      beforeEach(async () => {
        await baseBucketBuild.$query().patch({ type: "check" });
        await factory.BuildReview.create({
          buildId: baseBucketBuild.id,
          state: "approved",
        });
      });

      it("returns the bucket", async () => {
        const result = await getBaseBucketForBuildAndCommit(
          build,
          "766b744bc5fa27a330283dfd47ffafdaf905a941",
          { approved: true },
        );
        expect(result).toEqual(baseBucket);
      });
    });
  });

  describe("when the build is triggered normally on main", () => {
    let baseBucket: ScreenshotBucket;
    let build: Build;

    beforeEach(async () => {
      await setupDatabase();
      const project = await factory.Project.create();
      const buckets = await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: project.id,
          commit: "766b744bc5fa27a330283dfd47ffafdaf905a941",
        },
        {
          projectId: project.id,
          commit: "ffe0d51d369faa5ec184454b904f17c10f33f0bc",
        },
      ]);
      baseBucket = buckets[0]!;
      const bucket = buckets[1]!;
      const builds = await factory.Build.createMany(2, [
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: baseBucket.id,
          jobStatus: "complete",
          type: "reference",
          prHeadCommit: null,
          name: "default",
          projectId: project.id,
        },
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: bucket.id,
          jobStatus: "pending",
          prHeadCommit: null,
          name: "default",
          projectId: project.id,
        },
      ]);
      build = builds[1]!;
    });

    it("returns the base bucket", async () => {
      const result = await getBaseBucketForBuildAndCommit(
        build,
        "766b744bc5fa27a330283dfd47ffafdaf905a941",
        { approved: true },
      );
      expect(result).toEqual(baseBucket);
    });
  });
});

describe("#getBucketFromCommits", () => {
  let build: Build;

  beforeEach(async () => {
    await setupDatabase();
    const project = await factory.Project.create();
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      mode: "ci",
      name: "default",
    });
    build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      jobStatus: "pending",
      name: "default",
      mode: "ci",
      type: "check",
    });
  });

  async function createEligibleBucket(commit: string) {
    const bucket = await factory.ScreenshotBucket.create({
      projectId: build.projectId,
      commit,
      mode: build.mode,
      name: build.name,
    });
    await factory.Build.create({
      projectId: build.projectId,
      compareScreenshotBucketId: bucket.id,
      jobStatus: "complete",
      name: build.name,
      mode: build.mode,
      type: "reference",
    });
    return bucket;
  }

  it("returns null when no commits are provided", async () => {
    const result = await getBucketFromCommits({
      shas: [],
      build,
    });
    expect(result).toBeNull();
  });

  it("returns the bucket matching the first commit in the list", async () => {
    await createEligibleBucket("b779e503ff5163689cf480c5c58548cb98f735c7");
    const preferredBucket = await createEligibleBucket(
      "31360c7921acf2c22bf3bcc3f416a3823d6fbc9d",
    );
    const result = await getBucketFromCommits({
      shas: [
        "31360c7921acf2c22bf3bcc3f416a3823d6fbc9d",
        "b779e503ff5163689cf480c5c58548cb98f735c7",
      ],
      build,
    });
    expect(result).toEqual(preferredBucket);
  });

  it("returns the most recent bucket when multiple buckets share a commit", async () => {
    const olderBucket = await createEligibleBucket(
      "29f2757a14512b1c07547e6a0f516a731f7518f7",
    );
    const latestBucket = await createEligibleBucket(
      "29f2757a14512b1c07547e6a0f516a731f7518f7",
    );
    expect(latestBucket.id).not.toEqual(olderBucket.id);
    const result = await getBucketFromCommits({
      shas: ["29f2757a14512b1c07547e6a0f516a731f7518f7"],
      build,
    });
    expect(result).toEqual(latestBucket);
  });

  it("returns null when commits do not match any base bucket", async () => {
    await createEligibleBucket("fe709bb92b38564a7547d0136206fca1b2e2d73f");
    const result = await getBucketFromCommits({
      shas: ["15c4ef8807c45a8af00eed56ccd3e3227a0bfd6d"],
      build,
    });
    expect(result).toBeNull();
  });
});
