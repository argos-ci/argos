import { setTimeout as delay } from "node:timers/promises";

import type {
  Build,
  File,
  Project,
  Screenshot,
  ScreenshotBucket,
} from "@argos-ci/database/models";
import { BuildNotification, ScreenshotDiff } from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";
import { quitAmqp } from "@argos-ci/job-core";

import { performBuild } from "./index.js";

describe("build", () => {
  useDatabase();

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("performBuild", () => {
    let build: Build;
    let project: Project;
    let compareBucket: ScreenshotBucket;

    beforeEach(async () => {
      project = await factory.create<Project>("Project");
      compareBucket = await factory.create<ScreenshotBucket>(
        "ScreenshotBucket",
        {
          projectId: project.id,
        }
      );
      build = await factory.create<Build>("Build", {
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        projectId: project.id,
        jobStatus: "pending",
      });
      const file = await factory.create<File>("File");
      await factory.create<Screenshot>("Screenshot", {
        name: "b",
        screenshotBucketId: compareBucket.id,
        fileId: file.id,
      });
    });

    it("works", async () => {
      await factory.create("ScreenshotBucket", {
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
