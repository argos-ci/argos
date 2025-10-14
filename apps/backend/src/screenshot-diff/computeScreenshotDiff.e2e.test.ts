import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import config from "@/config/index.js";
import {
  ArtifactBucket,
  ArtifactDiff,
  Build,
  Project,
  Test,
} from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";
import { quitAmqp } from "@/job-core/index.js";
import { getS3Client, uploadFromFilePath } from "@/storage/index.js";
import type { S3Client } from "@/storage/index.js";

import { computeArtifactDiff } from "./computeScreenshotDiff.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#computeArtifactDiff", () => {
  let s3: S3Client;
  let baseBucket: ArtifactBucket;
  let build: Build;
  let headBucket: ArtifactBucket;
  let screenshotDiff: ArtifactDiff;
  let project: Project;

  beforeAll(async () => {
    s3 = getS3Client();
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope.png",
      inputPath: join(__dirname, "__fixtures__", "penelope.png"),
    });
    await uploadFromFilePath({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: "penelope-argos.png",
      inputPath: join(__dirname, "__fixtures__", "penelope-argos.png"),
    });
  });

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      token: "xx",
    });
    const buckets = await factory.ArtifactBucket.createMany(2, [
      {
        name: "test-bucket",
        branch: "test-branch",
        projectId: project.id,
      },
      {
        name: "base-bucket",
        branch: "master",
        projectId: project.id,
      },
    ]);
    headBucket = buckets[0]!;
    baseBucket = buckets[1]!;
    build = await factory.Build.create({
      baseArtifactBucketId: baseBucket.id,
      headArtifactBucketId: headBucket.id,
      projectId: project.id,
    });
  });

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("with two different screenshots", () => {
    let test: Test;
    beforeEach(async () => {
      const headArtifact = await factory.Artifact.create({
        name: "penelope",
        s3Id: "penelope-argos.png",
        artifactBucketId: headBucket.id,
      });
      const baseArtifact = await factory.Artifact.create({
        name: "penelope",
        s3Id: "penelope.png",
        artifactBucketId: baseBucket.id,
      });
      test = await factory.Test.create({
        name: headArtifact.name,
        projectId: project.id,
        buildName: "default",
      });
      screenshotDiff = await factory.ArtifactDiff.create({
        buildId: build.id,
        baseArtifactId: baseArtifact.id,
        headArtifactId: headArtifact.id,
        jobStatus: "pending",
        testId: test.id,
      });
    });

    it('should update result and notify "diff-detected"', async () => {
      await computeArtifactDiff(screenshotDiff, {
        s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.score! > 0).toBe(true);
      expect(typeof screenshotDiff.s3Id === "string").toBe(true);
      // expect(pushBuildNotification).toBeCalledWith({
      //   buildId: build.id,
      //   type: "diff-detected",
      // });
    });
  });

  describe("with two same screenshots", () => {
    beforeEach(async () => {
      const headArtifact = await factory.Artifact.create({
        name: "penelope",
        s3Id: "penelope.png",
        artifactBucketId: headBucket.id,
      });
      const baseArtifact = await factory.Artifact.create({
        name: "penelope",
        s3Id: "penelope.png",
        artifactBucketId: baseBucket.id,
      });
      screenshotDiff = await factory.ArtifactDiff.create({
        buildId: build.id,
        baseArtifactId: baseArtifact.id,
        headArtifactId: headArtifact.id,
        jobStatus: "pending",
      });
    });

    it('should not update result and notify "no-diff-detected"', async () => {
      await computeArtifactDiff(screenshotDiff, {
        s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.score).toBe(0);
      expect(screenshotDiff.s3Id).toBe(null);
      // expect(pushBuildNotification).toBeCalledWith({
      //   buildId: build.id,
      //   type: "no-diff-detected",
      // });
    });
  });
});
