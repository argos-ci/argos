import { test as baseTest, beforeEach, describe, expect } from "vitest";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getCIBase, type GetCIBaseArgs } from "./base";

const HEAD_COMMIT = "0000000000000000000000000000000000000000";

type Fixtures = {
  project: Project;
  compareBucket: ScreenshotBucket;
  build: Build;
  args: GetCIBaseArgs;
};

/**
 * These tests focus on the path where no git provider (GitHub/GitLab) is
 * detected on the project. In that case we can only rely on the information
 * sent by the build itself: `baseCommit` and `parentCommits`.
 */
const test = baseTest.extend<Fixtures>({
  // A project without any git provider attached.
  project: async ({}, use) => {
    await use(await factory.Project.create({ githubRepositoryId: null }));
  },
  compareBucket: async ({ project }, use) => {
    await use(
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        commit: HEAD_COMMIT,
        branch: "feature",
      }),
    );
  },
  build: async ({ project, compareBucket }, use) => {
    await use(
      await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareBucket.id,
        name: "default",
        mode: "ci",
        type: "check",
        baseBranch: null,
        baseCommit: null,
        parentCommits: null,
      }),
    );
  },
  args: async ({ build, compareBucket, project }, use) => {
    await use({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });
  },
});

/**
 * Create an eligible baseline bucket for the project at a given commit, backed
 * by a completed & approved build so it can be picked as a base.
 */
async function createBaseline(project: Project, commit: string) {
  const bucket = await factory.ScreenshotBucket.create({
    projectId: project.id,
    name: "default",
    mode: "ci",
    commit,
  });
  const build = await factory.Build.create({
    projectId: project.id,
    compareScreenshotBucketId: bucket.id,
    name: "default",
    mode: "ci",
    type: "check",
    jobStatus: "complete",
  });
  await factory.BuildReview.create({ buildId: build.id, state: "approved" });
  return bucket;
}

describe("#getCIBase (no git provider)", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("returns no base bucket when there is no base commit nor parent commits", async ({
    args,
  }) => {
    const result = await getCIBase(args);
    expect(result.baseBucket).toBeNull();
    expect(result.baseBranch).toBe("main");
    expect(result.baseBranchResolvedFrom).toBe("project");
  });

  test("returns the bucket matching the base commit", async ({
    args,
    build,
    project,
  }) => {
    const baseCommit = "1111111111111111111111111111111111111111";
    const baseBucket = await createBaseline(project, baseCommit);
    await build.$query().patch({ baseCommit });

    const result = await getCIBase(args);
    expect(
      result.baseBucket && "id" in result.baseBucket && result.baseBucket.id,
    ).toBe(baseBucket.id);
    // A base commit without a base branch leaves the branch unresolved.
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
  });

  test("uses parent commits to find a base bucket when there is no base commit", async ({
    args,
    build,
    project,
  }) => {
    const ancestorCommit = "2222222222222222222222222222222222222222";
    const baseBucket = await createBaseline(project, ancestorCommit);
    // The first element is the head itself, it is sliced off before searching.
    await build
      .$query()
      .patch({ parentCommits: [HEAD_COMMIT, ancestorCommit] });

    const result = await getCIBase(args);
    expect(
      result.baseBucket && "id" in result.baseBucket && result.baseBucket.id,
    ).toBe(baseBucket.id);
    expect(result.baseBranch).toBe("main");
    expect(result.baseBranchResolvedFrom).toBe("project");
  });

  test("falls back to parent commits when the base commit has no bucket", async ({
    args,
    build,
    project,
  }) => {
    const baseCommit = "5555555555555555555555555555555555555555";
    const ancestorCommit = "6666666666666666666666666666666666666666";
    const baseBucket = await createBaseline(project, ancestorCommit);
    await build
      .$query()
      .patch({ baseCommit, parentCommits: [baseCommit, ancestorCommit] });

    const result = await getCIBase(args);
    expect(
      result.baseBucket && "id" in result.baseBucket && result.baseBucket.id,
    ).toBe(baseBucket.id);
  });

  test("uses parent commits when the base commit equals the head", async ({
    args,
    build,
    project,
  }) => {
    const ancestorCommit = "7777777777777777777777777777777777777777";
    const baseBucket = await createBaseline(project, ancestorCommit);
    await build.$query().patch({
      baseCommit: HEAD_COMMIT,
      parentCommits: [HEAD_COMMIT, ancestorCommit],
    });

    const result = await getCIBase(args);
    expect(
      result.baseBucket && "id" in result.baseBucket && result.baseBucket.id,
    ).toBe(baseBucket.id);
  });
});
