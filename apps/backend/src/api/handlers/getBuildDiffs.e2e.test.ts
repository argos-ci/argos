import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type {
  Build,
  File,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getBuildDiffs } from "./getBuildDiffs";

const app = createTestHandlerApp(getBuildDiffs);
const screenshotMetadata = {
  url: "https://argos-ci.com",
  viewport: { width: 800, height: 600 },
  colorScheme: "light" as const,
  mediaType: "screen" as const,
  automationLibrary: { name: "playwright", version: "1.0.0" },
  sdk: { name: "@argos-ci/playwright", version: "0.0.1" },
};

const test = base.extend<{
  factory: typeof factory;
  project: Project;
  buckets: { base: ScreenshotBucket; compare: ScreenshotBucket };
  build: Build;
  files: { base: File; compare: File };
  screenshots: { base: Screenshot; compare: Screenshot };
  diffFile: File;
  screenshotDiff: ScreenshotDiff;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  project: async ({ factory }, use) => {
    const project = await factory.Project.create({
      name: "diffs-project",
      token: "token-with-diffs",
    });
    await use(project);
  },
  buckets: async ({ factory, project }, use) => {
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        { projectId: project.id, name: "base" },
        { projectId: project.id, name: "head" },
      ]);
    invariant(baseBucket && compareBucket);
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
  files: async ({ factory }, use) => {
    const [baseFile, compareFile] = await factory.File.createMany(2, [
      { key: "base-file-key", type: "screenshot" },
      { key: "compare-file-key", type: "screenshot" },
    ]);
    invariant(baseFile && compareFile);
    await use({ base: baseFile, compare: compareFile });
  },
  diffFile: async ({ factory }, use) => {
    const diffFile = await factory.File.create({
      key: "diff-file-key",
      type: "screenshotDiff",
    });
    invariant(diffFile);
    await use(diffFile);
  },
  screenshots: async ({ factory, buckets, files }, use) => {
    const [baseScreenshot, compareScreenshot] =
      await factory.Screenshot.createMany(2, [
        {
          screenshotBucketId: buckets.base.id,
          name: "home.png",
          parentName: "home",
          fileId: files.base.id,
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.compare.id,
          name: "home.png",
          baseName: "home.png",
          parentName: "home",
          fileId: files.compare.id,
          metadata: screenshotMetadata,
        },
      ]);
    invariant(baseScreenshot && compareScreenshot);
    await use({ base: baseScreenshot, compare: compareScreenshot });
  },
  screenshotDiff: async ({ factory, build, screenshots, diffFile }, use) => {
    const screenshotDiff = await factory.ScreenshotDiff.create({
      buildId: build.id,
      baseScreenshotId: screenshots.base.id,
      compareScreenshotId: screenshots.compare.id,
      score: 0.42,
      group: "main",
      ignored: false,
      fileId: diffFile.id,
      s3Id: diffFile.key,
    });
    await use(screenshotDiff);
  },
});

describe("getBuildDiffs", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get("/builds/non-existing-id/diffs")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  describe("with a build from another project", () => {
    test("returns 404 status code", async ({ factory, project }) => {
      const otherProject = await factory.Project.create();
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: otherProject.id,
      });
      const foreignBuild = await factory.Build.create({
        projectId: otherProject.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
      });

      await request(app)
        .get(`/builds/${foreignBuild.id}/diffs`)
        .set("Authorization", `Bearer ${project.token}`)
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });
  });

  describe("with screenshot diffs", () => {
    test("returns paginated diffs with screenshots", async ({
      build,
      project,
      screenshotDiff,
      screenshots,
      files,
    }) => {
      const res = await request(app)
        .get(`/builds/${build.id}/diffs`)
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body.pageInfo).toEqual({
        total: 1,
        page: 1,
        perPage: 30,
      });
      expect(res.body.results).toHaveLength(1);

      const [diff] = res.body.results;
      expect(diff).toMatchObject({
        id: screenshotDiff.id,
        name: "home.png",
        status: "changed",
        score: 0.42,
        group: "main",
        parentName: "home",
      });
      expect(diff.url).toContain("diff-file-key");
      expect(diff.base).toMatchObject({
        id: screenshots.base.id,
        name: screenshots.base.name,
        metadata: screenshotMetadata,
        width: files.base.width,
        height: files.base.height,
        contentType: files.base.contentType,
      });
      expect(diff.head).toMatchObject({
        id: screenshots.compare.id,
        name: screenshots.compare.name,
        metadata: screenshotMetadata,
      });
      expect(diff.base.url).toContain(files.base.key);
      expect(diff.base.originalUrl).toContain(files.base.key);
      expect(diff.head.url).toContain(files.compare.key);
      expect(diff.head.originalUrl).toContain(files.compare.key);
    });
  });
});
