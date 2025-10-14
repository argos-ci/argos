import { beforeEach, describe, expect, it } from "vitest";

import type {
  ArtifactBucket,
  Build,
  Project,
} from "@/database/models/index.js";
import { ArtifactDiff, BuildNotification } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { performBuild } from "./index.js";

describe("build", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("performBuild", () => {
    let build: Build;
    let project: Project;
    let headBucket: ArtifactBucket;

    beforeEach(async () => {
      project = await factory.Project.create({
        githubRepositoryId: null,
      });
      headBucket = await factory.ArtifactBucket.create({
        projectId: project.id,
      });
      build = await factory.Build.create({
        baseScreenshotBucketId: null,
        headArtifactBucketId: headBucket.id,
        projectId: project.id,
        jobStatus: "progress",
        conclusion: null,
      });
      const file = await factory.File.create({
        type: "screenshot",
      });
      await factory.Artifact.create({
        name: "b",
        screenshotBucketId: headBucket.id,
        fileId: file.id,
      });
      await factory.ArtifactBucket.create({
        projectId: project.id,
        complete: true,
      });
    });

    it("works", async () => {
      await performBuild(build);
      const notifications = await BuildNotification.query()
        .where("buildId", build.id)
        .orderBy("createdAt", "asc");

      expect(notifications).toHaveLength(2);
      expect(notifications[0]).toHaveProperty("type", "progress");
      expect(notifications[1]).toHaveProperty("type", "diff-detected");

      const diffs = await ArtifactDiff.query().where("buildId", build.id);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toHaveProperty("jobStatus", "complete");
      expect(diffs[0]).toHaveProperty("score", null);
      expect(diffs[0]).toHaveProperty("s3Id", null);
    });
  });
});
