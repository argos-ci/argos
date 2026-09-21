import { beforeEach, describe, expect, it } from "vitest";

import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { type BuildsFilters, queryBuilds, resolveBuildsFilters } from "./build";

const MAIN_COMMIT = "a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0";
const PR_HEAD_COMMIT = "0d9c8b7a6f5e4d3c2b1a0d9c8b7a6f5e4d3c2b1a";

async function getIds(input: {
  projectId: string | string[];
  filters?: BuildsFilters | null;
  limits?: { names?: number; buckets?: number };
}) {
  const query = queryBuilds({
    projectId: input.projectId,
    filters: await resolveBuildsFilters(input),
  });
  const builds = await query.orderBy("builds.id");
  return builds.map((build) => build.id);
}

/**
 * Limits low enough that the fixtures below go past them, so the fallbacks
 * the search takes on a big project are exercised on a small one.
 */
const FALLBACK_LIMITS = { names: 1, buckets: 1 };

describe("database/services/build", () => {
  describe("#queryBuilds", () => {
    let project: Project;
    let mainBuild: Build;
    let featureBuild: Build;
    let prBuild: Build;

    beforeEach(async () => {
      await setupDatabase();
      project = await factory.Project.create();
      const [mainBucket, featureBucket, fixBucket] =
        await factory.ScreenshotBucket.createMany(3, [
          { projectId: project.id, branch: "main", commit: MAIN_COMMIT },
          { projectId: project.id, branch: "feat/search-box" },
          { projectId: project.id, branch: "fix/login" },
        ]);
      [mainBuild, featureBuild, prBuild] = (await factory.Build.createMany(3, [
        {
          projectId: project.id,
          name: "default",
          type: "reference",
          compareScreenshotBucketId: mainBucket!.id,
        },
        {
          projectId: project.id,
          name: "storybook",
          type: "check",
          compareScreenshotBucketId: featureBucket!.id,
        },
        {
          projectId: project.id,
          name: "default",
          compareScreenshotBucketId: fixBucket!.id,
          prHeadCommit: PR_HEAD_COMMIT,
        },
      ])) as [Build, Build, Build];
    });

    it("matches all builds of the project without filters", async () => {
      const otherProject = await factory.Project.create();
      await factory.Build.create({ projectId: otherProject.id });
      await expect(getIds({ projectId: project.id })).resolves.toEqual([
        mainBuild.id,
        featureBuild.id,
        prBuild.id,
      ]);
    });

    it("filters by exact name", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { name: "default" } }),
      ).resolves.toEqual([mainBuild.id, prBuild.id]);
    });

    it("filters by type, always matching typeless builds", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { type: ["check"] } }),
      ).resolves.toEqual([featureBuild.id, prBuild.id]);
    });

    it("filters by exact branch", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { branch: "main" } }),
      ).resolves.toEqual([mainBuild.id]);
    });

    it("filters by commit, matching prHeadCommit first", async () => {
      await expect(
        getIds({
          projectId: project.id,
          filters: { commit: PR_HEAD_COMMIT },
        }),
      ).resolves.toEqual([prBuild.id]);
      // The bucket commit only matches when prHeadCommit is not set.
      await expect(
        getIds({
          projectId: project.id,
          filters: { commit: MAIN_COMMIT },
        }),
      ).resolves.toEqual([mainBuild.id]);
      const fixBucketCommit = (await prBuild.$relatedQuery(
        "compareScreenshotBucket",
      ))!.commit;
      await expect(
        getIds({
          projectId: project.id,
          filters: { commit: fixBucketCommit },
        }),
      ).resolves.toEqual([]);
    });

    it("searches by branch substring, case-insensitively", async () => {
      await expect(
        getIds({
          projectId: project.id,
          filters: { search: "SEARCH-b" },
        }),
      ).resolves.toEqual([featureBuild.id]);
    });

    it("searches by name substring", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { search: "storyb" } }),
      ).resolves.toEqual([featureBuild.id]);
    });

    it("searches across name and branch at once", async () => {
      // "fi" is in the `fix/login` branch and in no build name, "de" is in
      // the `default` name and in no branch: each arm has to hold on its own.
      await expect(
        getIds({ projectId: project.id, filters: { search: "fi" } }),
      ).resolves.toEqual([prBuild.id]);
      await expect(
        getIds({ projectId: project.id, filters: { search: "de" } }),
      ).resolves.toEqual([mainBuild.id, prBuild.id]);
      // "e" is in the `default` name and in the `feat/search-box` branch, so
      // the two arms have to be unioned, not intersected.
      await expect(
        getIds({ projectId: project.id, filters: { search: "e" } }),
      ).resolves.toEqual([mainBuild.id, featureBuild.id, prBuild.id]);
    });

    it("matches nothing when the search matches no name, branch or commit", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { search: "nope" } }),
      ).resolves.toEqual([]);
    });

    describe("past the resolution limits", () => {
      // On a project too big to resolve the names or the buckets, the search
      // matches them in the build query instead. Nothing but the limits
      // changes, so the answers have to be the same.
      it("falls back to matching the name and the bucket per build", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { search: "i" },
            limits: FALLBACK_LIMITS,
          }),
        ).resolves.toEqual([mainBuild.id, prBuild.id]);
        await expect(
          getIds({
            projectId: project.id,
            filters: { search: "storyb" },
            limits: FALLBACK_LIMITS,
          }),
        ).resolves.toEqual([featureBuild.id]);
      });

      it("falls back with a SHA search too", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { search: MAIN_COMMIT.slice(0, 8) },
            limits: { names: 1, buckets: 0 },
          }),
        ).resolves.toEqual([mainBuild.id]);
        await expect(
          getIds({
            projectId: project.id,
            filters: { search: PR_HEAD_COMMIT.slice(0, 12) },
            limits: { names: 1, buckets: 0 },
          }),
        ).resolves.toEqual([prBuild.id]);
      });

      it("stays scoped to the project when it reads the bucket per build", async () => {
        const otherProject = await factory.Project.create();
        const foreignBucket = await factory.ScreenshotBucket.create({
          projectId: otherProject.id,
          branch: "iii-foreign",
        });
        const strayBuild = await factory.Build.create({
          projectId: project.id,
          name: "default",
          compareScreenshotBucketId: foreignBucket.id,
        });
        // The branch matches, but the bucket belongs to another project — the
        // same answer the two resolved bucket arms give.
        await expect(
          getIds({
            projectId: project.id,
            filters: { search: "i" },
            limits: { names: 1, buckets: 0 },
          }),
        ).resolves.not.toContain(strayBuild.id);
      });
    });

    it("searches by commit prefix when the input looks like a SHA", async () => {
      await expect(
        getIds({
          projectId: project.id,
          filters: { search: MAIN_COMMIT.slice(0, 8) },
        }),
      ).resolves.toEqual([mainBuild.id]);
      await expect(
        getIds({
          projectId: project.id,
          filters: { search: PR_HEAD_COMMIT.slice(0, 12).toUpperCase() },
        }),
      ).resolves.toEqual([prBuild.id]);
    });

    it("escapes LIKE wildcards in the search", async () => {
      await expect(
        getIds({ projectId: project.id, filters: { search: "%" } }),
      ).resolves.toEqual([]);
      await expect(
        getIds({ projectId: project.id, filters: { search: "_" } }),
      ).resolves.toEqual([]);
    });

    it("combines filters", async () => {
      await expect(
        getIds({
          projectId: project.id,
          filters: { name: "default", search: "fix" },
        }),
      ).resolves.toEqual([prBuild.id]);
    });

    describe("status filter", () => {
      let changesBuild: Build;
      let acceptedBuild: Build;
      let abortedBuild: Build;

      beforeEach(async () => {
        [changesBuild, acceptedBuild, abortedBuild] =
          (await factory.Build.createMany(3, [
            { projectId: project.id, conclusion: "changes-detected" },
            { projectId: project.id, conclusion: "changes-detected" },
            { projectId: project.id, conclusion: null, jobStatus: "aborted" },
          ])) as [Build, Build, Build];
        await factory.BuildReview.create({
          buildId: acceptedBuild.id,
          state: "approved",
        });
      });

      it("filters by no-changes status", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { status: ["no-changes"] },
          }),
        ).resolves.toEqual([mainBuild.id, featureBuild.id, prBuild.id]);
      });

      it("filters by changes-detected status, excluding reviewed builds", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { status: ["changes-detected"] },
          }),
        ).resolves.toEqual([changesBuild.id]);
      });

      it("filters by accepted status", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { status: ["accepted"] },
          }),
        ).resolves.toEqual([acceptedBuild.id]);
      });

      it("filters by aborted status", async () => {
        await expect(
          getIds({
            projectId: project.id,
            filters: { status: ["aborted"] },
          }),
        ).resolves.toEqual([abortedBuild.id]);
      });
    });
  });
});
