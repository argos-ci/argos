import { factory } from "@/database/testing/index.js";
import { setupDatabase } from "@/database/testing/util.js";
import { beforeEach, describe, expect, it } from "vitest";
import { getAggregatedNotification } from "./aggregated.js";

describe("#getAggregatedNotification", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("with a single build", () => {
    beforeEach(async () => {
      const compareBucket = await factory.ScreenshotBucket.create({
        commit: "58ca89145e1f072e45e112a6158d17a23f54602d",
      });
      const build = await factory.Build.create({
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        jobStatus: "pending",
      });
      await factory.BuildNotification.create({
        buildId: build.id,
      });
    });

    it("returns null", async () => {
      const notification = await getAggregatedNotification(
        "58ca89145e1f072e45e112a6158d17a23f54602d",
        false,
      );
      expect(notification).toBeNull();
    });
  });

  describe("with multiple builds", () => {
    beforeEach(async () => {
      const buckets = await factory.ScreenshotBucket.createMany(2, {
        commit: "58ca89145e1f072e45e112a6158d17a23f54602d",
      });
      const builds = await factory.Build.createMany(2, [
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[0]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "b",
        },
      ]);
      await factory.BuildNotification.createMany(2, [
        {
          buildId: builds[0]!.id,
          type: "diff-detected",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
      ]);
    });

    it("returns a notification", async () => {
      const notification = await getAggregatedNotification(
        "58ca89145e1f072e45e112a6158d17a23f54602d",
        false,
      );
      expect(notification).toEqual({
        description: "Diff detected",
        githubState: "failure",
        gitlabState: "failed",
        vercelStatus: "completed",
        vercelConclusion: "failed",
      });
    });
  });

  describe("with multiple builds", () => {
    beforeEach(async () => {
      const buckets = await factory.ScreenshotBucket.createMany(2, {
        commit: "58ca89145e1f072e45e112a6158d17a23f54602d",
      });
      const builds = await factory.Build.createMany(3, [
        {
          createdAt: new Date("2021-01-01").toISOString(),
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[0]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "a",
        },
        {
          createdAt: new Date("2021-01-02").toISOString(),
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: buckets[1]!.id,
          jobStatus: "pending",
          name: "b",
        },
      ]);
      await factory.BuildNotification.createMany(3, [
        {
          buildId: builds[0]!.id,
          type: "diff-detected",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
        {
          buildId: builds[1]!.id,
          type: "diff-accepted",
        },
      ]);
    });

    it("ignores old builds", async () => {
      const notification = await getAggregatedNotification(
        "58ca89145e1f072e45e112a6158d17a23f54602d",
        false,
      );
      expect(notification).toEqual({
        description: "Diff accepted",
        githubState: "success",
        gitlabState: "success",
        vercelStatus: null,
        vercelConclusion: null,
      });
    });
  });
});
