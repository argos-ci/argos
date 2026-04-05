import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type {
  Account,
  Build,
  File,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
} from "@/database/models";
import { UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
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
  story: {
    id: "components-button--primary",
    tags: ["autodocs", "stable"],
    mode: "dark",
    play: true,
  },
};

const test = base.extend<{
  account: Account;
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
  account: async ({ factory }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  project: async ({ factory, account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
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

const getBuildDiffsPath = ({
  owner,
  project,
  buildNumber,
}: {
  owner: string;
  project: string;
  buildNumber: number;
}) => `/projects/${owner}/${project}/builds/${buildNumber}/diffs`;

describe("getBuildDiffs", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get(
          getBuildDiffsPath({ owner: "acme", project: "web", buildNumber: 1 }),
        )
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
    test("returns 401 status code", async ({ factory, account }) => {
      const otherProject = await factory.Project.create({
        accountId: account.id,
        name: "docs",
      });
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: otherProject.id,
      });
      const foreignBuild = await factory.Build.create({
        projectId: otherProject.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
      });

      await request(app)
        .get(
          getBuildDiffsPath({
            owner: "acme",
            project: otherProject.name,
            buildNumber: foreignBuild.number,
          }),
        )
        .set("Authorization", "Bearer token-with-diffs")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "token-with-diffs").`,
          );
        })
        .expect(401);
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
        .get(
          getBuildDiffsPath({
            owner: "acme",
            project: project.name,
            buildNumber: build.number,
          }),
        )
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
      expect(diff.head.url).toContain(files.compare.key);
    });

    test("returns diffs with a user access token", async ({ factory }) => {
      const [user, account] = await Promise.all([
        factory.User.create(),
        factory.TeamAccount.create(),
      ]);
      const [project] = await Promise.all([
        factory.Project.create({ accountId: account.id }),
        factory.UserAccount.create({ userId: user.id }),
        factory.TeamUser.create({
          teamId: account.teamId,
          userId: user.id,
          userLevel: "member",
        }),
      ]);
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
      });

      const token = `arp_${"e".repeat(36)}`;
      const userAccessToken = await factory.UserAccessToken.create({
        userId: user.id,
        token: hashToken(token),
      });
      await UserAccessTokenScope.query().insert({
        userAccessTokenId: userAccessToken.id,
        accountId: account.id,
      });

      const res = await request(app)
        .get(
          getBuildDiffsPath({
            owner: account.slug,
            project: project.name,
            buildNumber: build.number,
          }),
        )
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.pageInfo).toMatchObject({
        total: expect.any(Number),
        page: 1,
      });
      expect(Array.isArray(res.body.results)).toBe(true);
    });

    describe("with a mixed diff set on a non-subset build", () => {
      test.beforeEach(async ({ factory, build, buckets }) => {
        await build.$query().patch({ subset: false });

        const [
          changedBaseFile,
          changedHeadFile,
          unchangedBaseFile,
          unchangedHeadFile,
          ignoredBaseFile,
          ignoredHeadFile,
          addedHeadFile,
          removedBaseFile,
        ] = await factory.File.createMany(8, [
          { key: "changed-base-file", type: "screenshot" },
          { key: "changed-head-file", type: "screenshot" },
          { key: "unchanged-base-file", type: "screenshot" },
          { key: "unchanged-head-file", type: "screenshot" },
          { key: "ignored-base-file", type: "screenshot" },
          { key: "ignored-head-file", type: "screenshot" },
          { key: "added-head-file", type: "screenshot" },
          { key: "removed-base-file", type: "screenshot" },
        ]);
        invariant(
          changedBaseFile &&
            changedHeadFile &&
            unchangedBaseFile &&
            unchangedHeadFile &&
            ignoredBaseFile &&
            ignoredHeadFile &&
            addedHeadFile &&
            removedBaseFile,
        );

        const [
          changedBaseScreenshot,
          changedHeadScreenshot,
          unchangedBaseScreenshot,
          unchangedHeadScreenshot,
          ignoredBaseScreenshot,
          ignoredHeadScreenshot,
          addedHeadScreenshot,
          removedBaseScreenshot,
        ] = await factory.Screenshot.createMany(8, [
          {
            screenshotBucketId: buckets.base.id,
            name: "changed.png",
            fileId: changedBaseFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.compare.id,
            name: "changed.png",
            fileId: changedHeadFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.base.id,
            name: "unchanged.png",
            fileId: unchangedBaseFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.compare.id,
            name: "unchanged.png",
            fileId: unchangedHeadFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.base.id,
            name: "ignored.png",
            fileId: ignoredBaseFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.compare.id,
            name: "ignored.png",
            fileId: ignoredHeadFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.compare.id,
            name: "added.png",
            fileId: addedHeadFile.id,
            metadata: screenshotMetadata,
          },
          {
            screenshotBucketId: buckets.base.id,
            name: "removed.png",
            fileId: removedBaseFile.id,
            metadata: screenshotMetadata,
          },
        ]);
        invariant(
          changedBaseScreenshot &&
            changedHeadScreenshot &&
            unchangedBaseScreenshot &&
            unchangedHeadScreenshot &&
            ignoredBaseScreenshot &&
            ignoredHeadScreenshot &&
            addedHeadScreenshot &&
            removedBaseScreenshot,
        );

        await factory.ScreenshotDiff.createMany(5, [
          {
            buildId: build.id,
            baseScreenshotId: changedBaseScreenshot.id,
            compareScreenshotId: changedHeadScreenshot.id,
            score: 0.42,
          },
          {
            buildId: build.id,
            baseScreenshotId: null,
            compareScreenshotId: addedHeadScreenshot.id,
            score: null,
          },
          {
            buildId: build.id,
            baseScreenshotId: removedBaseScreenshot.id,
            compareScreenshotId: null,
            score: null,
          },
          {
            buildId: build.id,
            baseScreenshotId: unchangedBaseScreenshot.id,
            compareScreenshotId: unchangedHeadScreenshot.id,
            score: 0,
          },
          {
            buildId: build.id,
            baseScreenshotId: ignoredBaseScreenshot.id,
            compareScreenshotId: ignoredHeadScreenshot.id,
            score: 0.73,
            ignored: true,
          },
        ]);
      });

      test("filters diffs that require review on non-subset builds", async ({
        build,
        project,
      }) => {
        const res = await request(app)
          .get(
            getBuildDiffsPath({
              owner: "acme",
              project: project.name,
              buildNumber: build.number,
            }),
          )
          .query({ needsReview: "true" })
          .set("Authorization", `Bearer ${project.token}`)
          .expect(200);

        expect(res.body.pageInfo).toEqual({
          total: 3,
          page: 1,
          perPage: 30,
        });
        expect(
          res.body.results.map((diff: { name: string }) => diff.name),
        ).toEqual(["changed.png", "added.png", "removed.png"]);
      });

      test("returns all screenshot diffs when needsReview is not provided", async ({
        build,
        project,
      }) => {
        const res = await request(app)
          .get(
            getBuildDiffsPath({
              owner: "acme",
              project: project.name,
              buildNumber: build.number,
            }),
          )
          .set("Authorization", `Bearer ${project.token}`)
          .expect(200);

        expect(res.body.pageInfo).toEqual({
          total: 5,
          page: 1,
          perPage: 30,
        });
        expect(
          res.body.results.map((diff: { name: string }) => diff.name),
        ).toEqual([
          "changed.png",
          "added.png",
          "removed.png",
          "unchanged.png",
          "ignored.png",
        ]);
      });
    });

    test("does not include removed diffs when filtering review-required subset builds", async ({
      factory,
      build,
      project,
      buckets,
    }) => {
      await build.$query().patch({ subset: true });

      const [changedBaseFile, changedHeadFile, removedBaseFile] =
        await factory.File.createMany(3, [
          { key: "subset-changed-base-file", type: "screenshot" },
          { key: "subset-changed-head-file", type: "screenshot" },
          { key: "subset-removed-base-file", type: "screenshot" },
        ]);
      invariant(changedBaseFile && changedHeadFile && removedBaseFile);

      const [
        changedBaseScreenshot,
        changedHeadScreenshot,
        removedBaseScreenshot,
      ] = await factory.Screenshot.createMany(3, [
        {
          screenshotBucketId: buckets.base.id,
          name: "subset-changed.png",
          fileId: changedBaseFile.id,
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.compare.id,
          name: "subset-changed.png",
          fileId: changedHeadFile.id,
          metadata: screenshotMetadata,
        },
        {
          screenshotBucketId: buckets.base.id,
          name: "subset-removed.png",
          fileId: removedBaseFile.id,
          metadata: screenshotMetadata,
        },
      ]);
      invariant(
        changedBaseScreenshot && changedHeadScreenshot && removedBaseScreenshot,
      );

      await factory.ScreenshotDiff.createMany(2, [
        {
          buildId: build.id,
          baseScreenshotId: changedBaseScreenshot.id,
          compareScreenshotId: changedHeadScreenshot.id,
          score: 0.42,
        },
        {
          buildId: build.id,
          baseScreenshotId: removedBaseScreenshot.id,
          compareScreenshotId: null,
          score: null,
        },
      ]);

      const res = await request(app)
        .get(
          getBuildDiffsPath({
            owner: "acme",
            project: project.name,
            buildNumber: build.number,
          }),
        )
        .query({ needsReview: "true" })
        .set("Authorization", `Bearer ${project.token}`)
        .expect(200);

      expect(res.body.pageInfo).toEqual({
        total: 1,
        page: 1,
        perPage: 30,
      });
      expect(
        res.body.results.map((diff: { name: string }) => diff.name),
      ).toEqual(["subset-changed.png"]);
    });
  });
});
