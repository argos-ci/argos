import type { ScreenshotMetadata } from "@argos/schemas/screenshot-metadata";
import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import { knex } from "@/database";
import {
  IgnoredChange,
  type Build,
  type Project,
  type ScreenshotBucket,
  type ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { serializeSnapshotDiffs } from "./snapshot-diff";

const screenshotMetadata: ScreenshotMetadata = {
  url: "https://argos-ci.com",
  viewport: { width: 800, height: 600 },
  colorScheme: "light" as const,
  mediaType: "screen" as const,
  automationLibrary: { name: "playwright", version: "1.0.0" },
  sdk: { name: "@argos-ci/playwright", version: "0.0.1" },
  story: {
    id: "components-button--primary",
    tags: ["autodocs", "stable"],
    mode: "dark",
    play: true,
  },
};

const test = base.extend<{
  factory: typeof factory;
  project: Project;
  buckets: { base: ScreenshotBucket; compare: ScreenshotBucket };
  build: Build;
  changedDiff: ScreenshotDiff;
  pendingDiff: ScreenshotDiff;
  removedDiff: ScreenshotDiff;
  failureDiff: ScreenshotDiff;
  retryFailureDiff: ScreenshotDiff;
  noFileDiff: ScreenshotDiff;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  project: async ({ factory }, use) => {
    const project = await factory.Project.create({ name: "snapshot-project" });
    await use(project);
  },
  buckets: async ({ factory, project }, use) => {
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        { projectId: project.id, name: "base" },
        { projectId: project.id, name: "head" },
      ]);
    invariant(baseBucket, "Expected base screenshot bucket to be created");
    invariant(
      compareBucket,
      "Expected compare screenshot bucket to be created",
    );
    await use({ base: baseBucket, compare: compareBucket });
  },
  build: async ({ factory, project, buckets }, use) => {
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: buckets.compare.id,
      baseScreenshotBucketId: buckets.base.id,
    });
    await use(build);
  },
  changedDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const [baseFile, compareFile, diffFile] = await factory.File.createMany(3, [
      { key: "changed-base-file-key", type: "screenshot" },
      { key: "changed-compare-file-key", type: "screenshot" },
      { key: "changed-diff-file-key", type: "screenshotDiff" },
    ]);
    invariant(baseFile, "Expected changed diff base file to be created");
    invariant(compareFile, "Expected changed diff compare file to be created");
    invariant(diffFile, "Expected changed diff file to be created");
    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: buckets.base.id,
          testId: testModel.id,
          name: "home.png",
          parentName: "home",
          fileId: baseFile.id,
          s3Id: baseFile.key,
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.compare.id,
          testId: testModel.id,
          name: "home.png",
          baseName: "home.png",
          parentName: "home",
          fileId: compareFile.id,
          s3Id: compareFile.key,
          metadata: screenshotMetadata,
        },
      ]);
    invariant(baseScreenshot, "Expected changed base screenshot to be created");
    invariant(
      compareScreenshot,
      "Expected changed compare screenshot to be created",
    );
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      score: 0.42,
      group: "main",
      ignored: false,
      fileId: diffFile.id,
      s3Id: diffFile.key,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
  pendingDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const [baseFile, compareFile] = await factory.File.createMany(2, [
      { key: "pending-base-file-key", type: "screenshot" },
      { key: "pending-compare-file-key", type: "screenshot" },
    ]);
    invariant(baseFile, "Expected pending diff base file to be created");
    invariant(compareFile, "Expected pending diff compare file to be created");
    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: buckets.base.id,
          testId: testModel.id,
          name: "pending.png",
          parentName: "pending-story",
          fileId: baseFile.id,
          s3Id: baseFile.key,
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.compare.id,
          testId: testModel.id,
          name: "pending.png",
          parentName: "pending-story",
          fileId: compareFile.id,
          s3Id: compareFile.key,
          metadata: screenshotMetadata,
        },
      ]);
    invariant(baseScreenshot, "Expected pending base screenshot to be created");
    invariant(
      compareScreenshot,
      "Expected pending compare screenshot to be created",
    );
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      score: null,
      ignored: false,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
  removedDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const baseFile = await factory.File.create({
      key: "removed-base-file-key",
      type: "screenshot",
    });
    const baseScreenshot = await factory.Screenshot.create({
      screenshotBucketId: buckets.base.id,
      testId: testModel.id,
      name: "removed.png",
      parentName: "removed-story",
      fileId: baseFile.id,
      s3Id: baseFile.key,
      metadata: screenshotMetadata,
    });
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: null,
      score: null,
      ignored: false,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
  failureDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const compareFile = await factory.File.create({
      key: "failure-compare-file-key",
      type: "screenshot",
    });
    const compareScreenshot = await factory.Screenshot.create({
      screenshotBucketId: buckets.compare.id,
      testId: testModel.id,
      name: "button (failed).png",
      parentName: "failure-story",
      fileId: compareFile.id,
      s3Id: compareFile.key,
      metadata: {
        ...screenshotMetadata,
        test: undefined,
      },
    });
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: null,
      compareScreenshotId: compareScreenshot.id,
      score: null,
      ignored: false,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
  retryFailureDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const compareFile = await factory.File.create({
      key: "retry-failure-compare-file-key",
      type: "screenshot",
    });
    const compareScreenshot = await factory.Screenshot.create({
      screenshotBucketId: buckets.compare.id,
      testId: testModel.id,
      name: "button-retry (failed).png",
      parentName: "retry-story",
      fileId: compareFile.id,
      s3Id: compareFile.key,
      metadata: {
        ...screenshotMetadata,
        test: {
          title: "Retry failure test",
          titlePath: ["Retry failure test"],
          retry: 0,
          retries: 1,
        },
      },
    });
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: null,
      compareScreenshotId: compareScreenshot.id,
      score: null,
      ignored: false,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
  noFileDiff: async ({ factory, build, buckets, project }, use) => {
    const testModel = await factory.Test.create({ projectId: project.id });
    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: buckets.base.id,
          testId: testModel.id,
          name: "fallback.png",
          parentName: "fallback-story",
          fileId: null,
          s3Id: "fallback-base-key",
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.compare.id,
          testId: testModel.id,
          name: "fallback.png",
          parentName: "fallback-story",
          fileId: null,
          s3Id: "fallback-compare-key",
          metadata: screenshotMetadata,
        },
      ]);
    invariant(
      baseScreenshot,
      "Expected fallback base screenshot to be created",
    );
    invariant(
      compareScreenshot,
      "Expected fallback compare screenshot to be created",
    );
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      fileId: null,
      s3Id: "fallback-diff-key",
      score: 0.9,
      ignored: false,
    });
    const loadedDiff = await diff
      .$query()
      .withGraphFetched("[baseScreenshot.file, compareScreenshot.file, file]");
    await use(loadedDiff);
  },
});

describe("api/schema/primitives/snapshot-diff", () => {
  test("serializes a changed diff with nested snapshots and diff URL", async ({
    changedDiff,
    project,
  }) => {
    const [serialized] = await serializeSnapshotDiffs([changedDiff], {
      project,
      metricsFrom: new Date(0),
    });
    invariant(serialized, "Expected changed diff to serialize");

    expect(serialized).toMatchObject({
      id: changedDiff.id,
      name: "home.png",
      status: "changed",
      score: 0.42,
      group: "main",
      parentName: "home",
      base: {
        id: changedDiff.baseScreenshotId,
        name: "home.png",
        metadata: screenshotMetadata,
        width: 10,
        height: 10,
        contentType: "image/png",
      },
      head: {
        id: changedDiff.compareScreenshotId,
        name: "home.png",
        metadata: screenshotMetadata,
        width: 10,
        height: 10,
        contentType: "image/png",
      },
    });
    expect(serialized.url).toContain("changed-diff-file-key");
    expect(serialized.base?.url).toContain("changed-base-file-key");
    expect(serialized.head?.url).toContain("changed-compare-file-key");
  });

  test("serializes a pending diff", async ({ pendingDiff, project }) => {
    const [serialized] = await serializeSnapshotDiffs([pendingDiff], {
      project,
      metricsFrom: new Date(0),
    });
    invariant(serialized, "Expected pending diff to serialize");

    expect(serialized.status).toBe("pending");
    expect(serialized.base?.name).toBe("pending.png");
    expect(serialized.head?.name).toBe("pending.png");
  });

  test("serializes a removed diff and falls back to the base snapshot name", async ({
    removedDiff,
    project,
  }) => {
    const [serialized] = await serializeSnapshotDiffs([removedDiff], {
      project,
      metricsFrom: new Date(0),
    });
    invariant(serialized, "Expected removed diff to serialize");

    expect(serialized).toMatchObject({
      id: removedDiff.id,
      name: "removed.png",
      status: "removed",
      parentName: "removed-story",
      head: null,
    });
    expect(serialized.base?.name).toBe("removed.png");
  });

  test("serializes failure and retryFailure added diffs", async ({
    failureDiff,
    retryFailureDiff,
    project,
  }) => {
    const [failure, retryFailure] = await serializeSnapshotDiffs(
      [failureDiff, retryFailureDiff],
      { project, metricsFrom: new Date(0) },
    );
    invariant(failure, "Expected failure diff to serialize");
    invariant(retryFailure, "Expected retry failure diff to serialize");

    expect(failure.status).toBe("failure");
    expect(failure.base).toBeNull();
    expect(failure.head?.name).toBe("button (failed).png");

    expect(retryFailure.status).toBe("retryFailure");
    expect(retryFailure.base).toBeNull();
    expect(retryFailure.head?.name).toBe("button-retry (failed).png");
  });

  test("falls back to public URLs and default content type when files are missing", async ({
    noFileDiff,
    project,
  }) => {
    const [serialized] = await serializeSnapshotDiffs([noFileDiff], {
      project,
      metricsFrom: new Date(0),
    });
    invariant(serialized, "Expected no-file diff to serialize");

    expect(serialized.status).toBe("changed");
    expect(serialized.url).toContain("fallback-diff-key");
    expect(serialized.base).toMatchObject({
      name: "fallback.png",
      width: null,
      height: null,
      contentType: "image/png",
    });
    expect(serialized.head).toMatchObject({
      name: "fallback.png",
      width: null,
      height: null,
      contentType: "image/png",
    });
    expect(serialized.base?.url).toContain("fallback-base-key");
    expect(serialized.head?.url).toContain("fallback-compare-key");
  });

  test("exposes the test metrics and change data of a diff", async ({
    factory,
    build,
    buckets,
    project,
  }) => {
    const fingerprint = "a1b2c3d4e5f6";
    const testModel = await factory.Test.create({
      projectId: project.id,
      name: "flaky.png",
      buildName: "web",
    });
    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: buckets.base.id,
          testId: testModel.id,
          name: "flaky.png",
        },
        {
          screenshotBucketId: buckets.compare.id,
          testId: testModel.id,
          name: "flaky.png",
        },
      ]);
    invariant(baseScreenshot && compareScreenshot);
    const diff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      testId: testModel.id,
      fingerprint,
      score: 0.42,
      ignored: false,
    });

    // Seed the stats used to derive the test's flakiness metrics and the
    // change's occurrence count: the test ran in 2 builds and changed once.
    await Promise.all([
      knex("test_stats_builds").insert({
        testId: testModel.id,
        date: new Date("2025-06-01T00:00:00.000Z"),
        value: 2,
      }),
      knex("test_stats_fingerprints").insert({
        testId: testModel.id,
        fingerprint,
        date: new Date("2025-06-01T00:00:00.000Z"),
        value: 1,
      }),
      IgnoredChange.query().insert({
        projectId: project.id,
        testId: testModel.id,
        fingerprint,
      }),
    ]);

    const loadedDiff = await diff
      .$query()
      .withGraphFetched(
        "[baseScreenshot.file, compareScreenshot.file, file, test]",
      );

    const [serialized] = await serializeSnapshotDiffs([loadedDiff], {
      project,
      metricsFrom: new Date(0),
    });
    invariant(serialized, "Expected diff to serialize");

    expect(serialized.test).toMatchObject({
      id: expect.any(String),
      name: "flaky.png",
      buildName: "web",
      metrics: {
        total: 2,
        changes: 1,
        uniqueChanges: 1,
        stability: 0.5,
        consistency: 1,
        flakiness: 0.25,
      },
    });

    expect(serialized.change).toEqual({
      id: expect.any(String),
      ignored: true,
      occurrences: 1,
    });
  });
});
