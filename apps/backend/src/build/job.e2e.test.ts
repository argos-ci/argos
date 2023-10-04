import { beforeEach, describe, expect, it } from "vitest";

import type {
  Build,
  Project,
  ScreenshotBucket,
} from "@/database/models/index.js";
import { BuildNotification, ScreenshotDiff } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { performBuild } from "./index.js";

describe("build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("performBuild", () => {
    let build: Build;
    let project: Project;
    let compareBucket: ScreenshotBucket;

    beforeEach(async () => {
      project = await factory.Project.create();
      compareBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
      });
      build = await factory.Build.create({
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        projectId: project.id,
        jobStatus: "pending",
      });
      const file = await factory.File.create();
      await factory.Screenshot.create({
        name: "b",
        screenshotBucketId: compareBucket.id,
        fileId: file.id,
      });
    });

    it("works", async () => {
      await factory.ScreenshotBucket.create({
        projectId: project.id,
      });

      await performBuild(build);

      const notifications = await BuildNotification.query()
        .where("buildId", build.id)
        .orderBy("createdAt", "asc");

      expect(notifications).toHaveLength(2);
      expect(notifications[0]).toHaveProperty("type", "progress");
      expect(notifications[1]).toHaveProperty("type", "no-diff-detected");

      const diffs = await ScreenshotDiff.query().where("buildId", build.id);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toHaveProperty("jobStatus", "complete");
      expect(diffs[0]).toHaveProperty("validationStatus", "unknown");
      expect(diffs[0]).toHaveProperty("score", null);
      expect(diffs[0]).toHaveProperty("s3Id", null);
    });
  });
});
