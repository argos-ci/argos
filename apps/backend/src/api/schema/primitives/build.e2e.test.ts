import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  BuildListParamsSchema,
  listBuilds,
  serializeBuild,
  serializeBuilds,
} from "./build";

const test = base.extend<{
  factory: typeof factory;
  serializeProject: Project;
  serializeBuckets: { base: ScreenshotBucket; compare: ScreenshotBucket };
  serializeBuildFixture: Build;
  serializeManyBuilds: [Build, Build];
  listBuildsProject: Project;
  namedBuilds: {
    firstNamed: Build;
    latestNamed: Build;
    shaFromBucket: Build;
    shaFromPrHead: Build;
    ignored: Build;
  };
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  serializeProject: async ({ factory }, use) => {
    const project = await factory.Project.create({ name: "backend-api" });
    await use(project);
  },
  serializeBuckets: async ({ factory, serializeProject }, use) => {
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: serializeProject.id,
          branch: "main",
          commit: "a".repeat(40),
          name: "base",
        },
        {
          projectId: serializeProject.id,
          branch: "feature/login",
          commit: "b".repeat(40),
          name: "compare",
        },
      ]);
    invariant(baseBucket);
    invariant(compareBucket);
    await use({ base: baseBucket, compare: compareBucket });
  },
  serializeBuildFixture: async (
    { factory, serializeProject, serializeBuckets },
    use,
  ) => {
    const build = await factory.Build.create({
      projectId: serializeProject.id,
      baseScreenshotBucketId: serializeBuckets.base.id,
      compareScreenshotBucketId: serializeBuckets.compare.id,
      prHeadCommit: "c".repeat(40),
      conclusion: "no-changes",
      stats: {
        failure: 0,
        added: 0,
        unchanged: 1,
        changed: 0,
        removed: 0,
        total: 1,
        retryFailure: 0,
        ignored: 0,
      },
    });
    await use(build);
  },
  serializeManyBuilds: async ({ factory }, use) => {
    const project = await factory.Project.create();
    const [bucketA, bucketB] = await factory.ScreenshotBucket.createMany(2, [
      { projectId: project.id, branch: "main", commit: "d".repeat(40) },
      { projectId: project.id, branch: "main", commit: "e".repeat(40) },
    ]);
    invariant(bucketA);
    invariant(bucketB);

    const [first, second] = await factory.Build.createMany(2, [
      {
        projectId: project.id,
        compareScreenshotBucketId: bucketA.id,
        conclusion: "no-changes",
      },
      {
        projectId: project.id,
        compareScreenshotBucketId: bucketB.id,
        conclusion: "no-changes",
      },
    ]);
    invariant(first);
    invariant(second);
    await use([first, second]);
  },
  listBuildsProject: async ({ factory }, use) => {
    const project = await factory.Project.create();
    await use(project);
  },
  namedBuilds: async ({ factory, listBuildsProject }, use) => {
    const [mainBucket, featureBucket, otherBucket] =
      await factory.ScreenshotBucket.createMany(3, [
        {
          projectId: listBuildsProject.id,
          branch: "main",
          commit: "1".repeat(40),
          name: "main",
        },
        {
          projectId: listBuildsProject.id,
          branch: "feature",
          commit: "2".repeat(40),
          name: "feature",
        },
        {
          projectId: listBuildsProject.id,
          branch: "other",
          commit: "3".repeat(40),
          name: "other",
        },
      ]);
    invariant(mainBucket);
    invariant(featureBucket);
    invariant(otherBucket);

    const [firstNamed, latestNamed, shaFromBucket, shaFromPrHead, ignored] =
      await factory.Build.createMany(5, [
        {
          projectId: listBuildsProject.id,
          name: "web",
          compareScreenshotBucketId: mainBucket.id,
        },
        {
          projectId: listBuildsProject.id,
          name: "web",
          compareScreenshotBucketId: featureBucket.id,
        },
        {
          projectId: listBuildsProject.id,
          name: "docs",
          compareScreenshotBucketId: featureBucket.id,
          prHeadCommit: null,
        },
        {
          projectId: listBuildsProject.id,
          name: "cli",
          compareScreenshotBucketId: otherBucket.id,
          prHeadCommit: "2".repeat(40),
        },
        {
          projectId: listBuildsProject.id,
          name: "ignored",
          compareScreenshotBucketId: otherBucket.id,
          prHeadCommit: "f".repeat(40),
        },
      ]);
    invariant(firstNamed);
    invariant(latestNamed);
    invariant(shaFromBucket);
    invariant(shaFromPrHead);
    invariant(ignored);

    await use({
      firstNamed,
      latestNamed,
      shaFromBucket,
      shaFromPrHead,
      ignored,
    });
  },
});

describe("api/schema/primitives/build", () => {
  describe("BuildListParamsSchema", () => {
    test("parses the distinctName flag", async () => {
      expect(
        BuildListParamsSchema.parse({
          page: "1",
          perPage: "30",
          distinctName: "true",
        }).distinctName,
      ).toBe(true);

      expect(
        BuildListParamsSchema.parse({
          page: "1",
          perPage: "30",
          distinctName: "false",
        }).distinctName,
      ).toBe(false);

      expect(
        BuildListParamsSchema.parse({
          page: "1",
          perPage: "30",
        }).distinctName,
      ).toBeNull();
    });
  });

  describe("serializeBuild", () => {
    test("serializes a build using bucket fallbacks when relations are missing", async ({
      serializeBuildFixture,
    }) => {
      const reloadedBuild = await serializeBuildFixture.$query();
      const serialized = await serializeBuild(reloadedBuild);

      expect(serialized).toMatchObject({
        id: serializeBuildFixture.id,
        number: serializeBuildFixture.number,
        head: {
          sha: "c".repeat(40),
          branch: "feature/login",
        },
        base: {
          sha: "a".repeat(40),
          branch: "main",
        },
        status: "no-changes",
        conclusion: "no-changes",
        stats: {
          failure: 0,
          added: 0,
          unchanged: 1,
          changed: 0,
          removed: 0,
          total: 1,
          retryFailure: 0,
          ignored: 0,
        },
        metadata: null,
      });
      expect(serialized.url).toContain(
        `/builds/${serializeBuildFixture.number}`,
      );
      expect(serialized.notification).toMatchObject({
        context: "argos",
        github: { state: "success" },
        gitlab: { state: "success" },
      });
      expect(serialized.notification?.description).toBe("Everything's good!");
    });

    test("serializes multiple builds in order", async ({
      serializeManyBuilds,
    }) => {
      const serialized = await serializeBuilds(serializeManyBuilds);
      const [first, second] = serializeManyBuilds;

      expect(serialized.map((build) => build.id)).toEqual([
        first.id,
        second.id,
      ]);
    });
  });

  describe("listBuilds", () => {
    test("returns builds in descending id order without filters", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { firstNamed, latestNamed, shaFromBucket, shaFromPrHead, ignored } =
        namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: null,
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        ignored.id,
        shaFromPrHead.id,
        shaFromBucket.id,
        latestNamed.id,
        firstNamed.id,
      ]);
      expect(builds.total).toBe(5);
    });

    test("paginates builds", async ({ listBuildsProject, namedBuilds }) => {
      const { latestNamed, shaFromBucket } = namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 2,
          perPage: 2,
          distinctName: null,
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        shaFromBucket.id,
        latestNamed.id,
      ]);
      expect(builds.total).toBe(5);
    });

    test("filters builds by head branch", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { latestNamed, shaFromBucket } = namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: null,
          head: "feature",
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        shaFromBucket.id,
        latestNamed.id,
      ]);
      expect(builds.total).toBe(2);
    });

    test("filters builds by head SHA from either prHeadCommit or bucket commit", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { latestNamed, shaFromBucket, shaFromPrHead } = namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: null,
          headSha: "2".repeat(40),
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        shaFromPrHead.id,
        shaFromBucket.id,
        latestNamed.id,
      ]);
      expect(builds.total).toBe(3);
    });

    test("combines head and head SHA filters", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { latestNamed, shaFromBucket } = namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: null,
          head: "feature",
          headSha: "2".repeat(40),
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        shaFromBucket.id,
        latestNamed.id,
      ]);
      expect(builds.total).toBe(2);
    });

    test("deduplicates builds by latest name when distinctName is enabled", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { firstNamed, latestNamed, shaFromBucket, shaFromPrHead, ignored } =
        namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: true,
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        ignored.id,
        shaFromPrHead.id,
        shaFromBucket.id,
        latestNamed.id,
      ]);
      expect(builds.total).toBe(4);
      expect(
        builds.results.filter((build) => build.name === firstNamed.name),
      ).toHaveLength(1);
    });

    test("does not deduplicate builds when distinctName is false", async ({
      listBuildsProject,
      namedBuilds,
    }) => {
      const { firstNamed, latestNamed, shaFromBucket, shaFromPrHead, ignored } =
        namedBuilds;

      const builds = await listBuilds(
        { projectId: listBuildsProject.id },
        {
          page: 1,
          perPage: 30,
          distinctName: false,
        },
      );

      expect(builds.results.map((build) => build.id)).toEqual([
        ignored.id,
        shaFromPrHead.id,
        shaFromBucket.id,
        latestNamed.id,
        firstNamed.id,
      ]);
      expect(builds.total).toBe(5);
    });
  });
});
