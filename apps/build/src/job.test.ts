import { setTimeout as delay } from "node:timers/promises";

import type {
  Build,
  Repository,
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
    let repository: Repository;
    let compareBucket: ScreenshotBucket;

    beforeEach(async () => {
      repository = await factory.create<Repository>("Repository");
      compareBucket = await factory.create<ScreenshotBucket>(
        "ScreenshotBucket",
        {
          repositoryId: repository.id,
        }
      );
      build = await factory.create<Build>("Build", {
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        repositoryId: repository.id,
        jobStatus: "pending",
      });
      await factory.create<Screenshot>("Screenshot", {
        name: "b",
        screenshotBucketId: compareBucket.id,
      });
    });

    it("works", async () => {
      await factory.create("ScreenshotBucket", {
        repositoryId: repository.id,
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
