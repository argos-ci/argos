import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterAll, test as base, beforeAll, describe, expect } from "vitest";

import config from "@/config";
import {
  AuditTrail,
  Build,
  IgnoredChange,
  Project,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
  User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { quitAmqp } from "@/job-core";
import { getS3Client, uploadFromFilePath } from "@/storage";
import type { S3Client } from "@/storage";

import { computeScreenshotDiff } from "./computeScreenshotDiff";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

type Fixtures = {
  fixture: {
    s3: S3Client;
    project: Project;
    build: Build;
    compareBucket: ScreenshotBucket;
    baseBucket: ScreenshotBucket;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();

    await factory.User.create({
      email: "argos-bot@no-reply.argos-ci.com",
      type: "bot",
    });

    const s3 = getS3Client();
    const project = await factory.Project.create({
      token: "xx",
    });
    const buckets = await factory.ScreenshotBucket.createMany(2, [
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
    const compareBucket = buckets[0]!;
    const baseBucket = buckets[1]!;
    const build = await factory.Build.create({
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      projectId: project.id,
      type: "reference",
    });

    await use({
      s3,
      project,
      build,
      compareBucket,
      baseBucket,
    });
  },
});

describe("#computeScreenshotDiff", () => {
  let s3: S3Client;
  let screenshotDiff: ScreenshotDiff;

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

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("with two different screenshots", () => {
    let screenshotTest: Test;
    test.beforeEach(async ({ fixture }) => {
      const [compareScreenshot, baseScreenshot] = await Promise.all([
        factory.Screenshot.create({
          name: "penelope",
          s3Id: "penelope-argos.png",
          screenshotBucketId: fixture.compareBucket.id,
        }),
        factory.Screenshot.create({
          name: "penelope",
          s3Id: "penelope.png",
          screenshotBucketId: fixture.baseBucket.id,
        }),
      ]);
      screenshotTest = await factory.Test.create({
        name: compareScreenshot.name,
        projectId: fixture.project.id,
        buildName: "default",
      });
      screenshotDiff = await factory.ScreenshotDiff.create({
        buildId: fixture.build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: "pending",
        testId: screenshotTest.id,
      });
    });

    test('should update result and notify "diff-detected"', async ({
      fixture,
    }) => {
      await computeScreenshotDiff(screenshotDiff, {
        s3: fixture.s3,
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

    test("should auto-ignore changes when configured threshold is reached", async ({
      fixture,
    }) => {
      await fixture.project.$query().patch({
        autoIgnore: {
          changes: 1,
        },
      });

      await computeScreenshotDiff(screenshotDiff, {
        s3: fixture.s3,
        bucket: config.get("s3.screenshotsBucket"),
      });

      await screenshotDiff.reload();
      expect(screenshotDiff.ignored).toBe(true);

      const ignoredChange = await IgnoredChange.query().findOne({
        projectId: fixture.project.id,
        testId: screenshotTest.id,
        fingerprint: screenshotDiff.fingerprint,
      });
      expect(ignoredChange).toBeTruthy();

      const auditTrail = await AuditTrail.query()
        .where({
          projectId: fixture.project.id,
          testId: screenshotTest.id,
          fingerprint: screenshotDiff.fingerprint,
          action: "files.ignored",
        })
        .first();
      expect(auditTrail).toBeTruthy();

      const actor = auditTrail
        ? await User.query().findById(auditTrail.userId)
        : null;
      expect(actor?.type).toBe("bot");
    });

    test("should not auto-ignore if latest action is user files.unignored", async ({
      fixture,
    }) => {
      const user = await factory.User.create();

      await computeScreenshotDiff(screenshotDiff, {
        s3: fixture.s3,
        bucket: config.get("s3.screenshotsBucket"),
      });
      await screenshotDiff.reload();
      expect(screenshotDiff.fingerprint).toBeTruthy();

      await AuditTrail.query().insert({
        date: new Date().toISOString(),
        projectId: fixture.project.id,
        testId: screenshotTest.id,
        userId: user.id,
        fingerprint: screenshotDiff.fingerprint,
        action: "files.unignored",
      });

      await fixture.project.$query().patch({
        autoIgnore: {
          changes: 1,
        },
      });

      const secondScreenshotDiff = await factory.ScreenshotDiff.create({
        buildId: fixture.build.id,
        baseScreenshotId: screenshotDiff.baseScreenshotId,
        compareScreenshotId: screenshotDiff.compareScreenshotId,
        jobStatus: "pending",
        testId: screenshotTest.id,
      });

      await computeScreenshotDiff(secondScreenshotDiff, {
        s3: fixture.s3,
        bucket: config.get("s3.screenshotsBucket"),
      });
      await secondScreenshotDiff.reload();

      expect(secondScreenshotDiff.ignored).toBe(false);

      const ignoredChange = await IgnoredChange.query().findOne({
        projectId: fixture.project.id,
        testId: screenshotTest.id,
        fingerprint: secondScreenshotDiff.fingerprint,
      });
      expect(ignoredChange).toBeFalsy();
    });
  });

  describe("with two same screenshots", () => {
    test.beforeEach(async ({ fixture }) => {
      const compareScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: fixture.compareBucket.id,
      });
      const baseScreenshot = await factory.Screenshot.create({
        name: "penelope",
        s3Id: "penelope.png",
        screenshotBucketId: fixture.baseBucket.id,
      });
      const test = await factory.Test.create({
        name: compareScreenshot.name,
        projectId: fixture.project.id,
        buildName: "default",
      });
      screenshotDiff = await factory.ScreenshotDiff.create({
        buildId: fixture.build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: "pending",
        testId: test.id,
      });
    });

    test('should not update result and notify "no-diff-detected"', async ({
      fixture,
    }) => {
      await computeScreenshotDiff(screenshotDiff, {
        s3: fixture.s3,
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
