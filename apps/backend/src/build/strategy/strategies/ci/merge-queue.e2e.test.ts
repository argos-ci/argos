import { invariant } from "@argos/util/invariant";
import { test as baseTest, beforeEach, describe, expect, vi } from "vitest";

import type { Build, Project, ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getCIBase, type GetCIBaseArgs } from "./base";
import { mergeBucketWithBuildDiffs } from "./bucket-merge";
import { getCIMergeQueueBase } from "./merge-queue";

vi.mock("./base", () => ({
  __esModule: true,
  getCIBase: vi.fn(),
}));

vi.mock("./bucket-merge", () => ({
  __esModule: true,
  mergeBucketWithBuildDiffs: vi.fn(),
}));

const mockGetCIBase = vi.mocked(getCIBase);
const mockMergeBucketWithBuildDiffs = vi.mocked(mergeBucketWithBuildDiffs);

type Fixtures = {
  branch: string;
  project: Project;
  compareBucket: ScreenshotBucket;
  build: Build;
  args: GetCIBaseArgs;
};

const test = baseTest.extend<Fixtures>({
  branch: async ({}, use) => {
    await use("feature/merge-queue");
  },
  project: async ({}, use) => {
    await use(await factory.Project.create());
  },
  compareBucket: async ({ project, branch }, use) => {
    await use(
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        branch,
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
        mergeQueue: true,
        type: "check",
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

describe("#getCIMergeQueueBase", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  test("falls back to CI base when no approved build exists", async ({
    args,
  }) => {
    const ciBaseResult = {
      baseBucket: null,
      baseBranch: "main",
      baseBranchResolvedFrom: "project" as const,
    };

    mockGetCIBase.mockResolvedValue(ciBaseResult);

    const result = await getCIMergeQueueBase(args);

    expect(result).toEqual(ciBaseResult);
    expect(mockMergeBucketWithBuildDiffs).not.toHaveBeenCalled();
  });

  test("returns the last approved bucket when CI base does not exist", async ({
    branch,
    project,
    compareBucket,
  }) => {
    invariant(
      project.githubRepositoryId,
      "Project should have a GitHub repository",
    );
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: project.githubRepositoryId,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      githubPullRequestId: pullRequest.id,
      name: "default",
      mode: "ci",
      mergeQueue: true,
      type: "check",
    });

    const approvedBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const lastApprovedBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: approvedBucket.id,
      githubPullRequestId: pullRequest.id,
      name: build.name,
      mode: "ci",
      mergeQueue: true,
      type: "check",
    });
    await factory.BuildReview.create({
      buildId: lastApprovedBuild.id,
      state: "approved",
    });

    mockGetCIBase.mockResolvedValue({
      baseBucket: null,
      baseBranch: "main",
      baseBranchResolvedFrom: "project",
    });

    const result = await getCIMergeQueueBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(
      result.baseBucket && "id" in result.baseBucket && result.baseBucket.id,
    ).toBe(approvedBucket.id);
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
    expect(mockMergeBucketWithBuildDiffs).not.toHaveBeenCalled();
  });

  test("merges the CI base bucket with the latest merge queue bucket", async ({
    branch,
    project,
    compareBucket,
  }) => {
    invariant(
      project.githubRepositoryId,
      "Project should have a GitHub repository",
    );
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: project.githubRepositoryId,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      githubPullRequestId: pullRequest.id,
      name: "default",
      mode: "ci",
      mergeQueue: true,
      type: "check",
    });

    const baseBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "main",
      createdAt: new Date("2024-01-01").toISOString(),
    });

    const lastApprovedBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const lastApprovedBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: lastApprovedBucket.id,
      githubPullRequestId: pullRequest.id,
      name: build.name,
      mode: "ci",
      mergeQueue: true,
      type: "check",
    });
    await factory.BuildReview.create({
      buildId: lastApprovedBuild.id,
      state: "approved",
    });

    const recentlyMergedBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: recentlyMergedBucket.id,
      name: build.name,
      mode: "ci",
      mergeQueue: true,
      createdAt: new Date("2024-02-01").toISOString(),
      conclusion: "no-changes",
      type: "check",
    });

    const virtualBucket = { screenshots: [] };
    mockGetCIBase.mockResolvedValue({
      baseBucket,
      baseBranch: "main",
      baseBranchResolvedFrom: "project",
    });
    mockMergeBucketWithBuildDiffs.mockResolvedValue(virtualBucket);

    const result = await getCIMergeQueueBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(mockMergeBucketWithBuildDiffs).toHaveBeenCalledOnce();
    const [bucketArg, buildArg] = mockMergeBucketWithBuildDiffs.mock.calls[0]!;
    expect(bucketArg).toHaveProperty("id", recentlyMergedBucket.id);
    expect(buildArg.id).toBe(lastApprovedBuild.id);
    expect(result.baseBucket).toBe(virtualBucket);
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
  });

  test('uses the latest "no-changes" build instead of the latest approved one', async ({
    branch,
    project,
  }) => {
    invariant(
      project.githubRepositoryId,
      "Project should have a GitHub repository",
    );
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: project.githubRepositoryId,
    });

    const [compareBucket, lastApprovedBucket, noChangesBucket] =
      await factory.ScreenshotBucket.createMany(3, {
        projectId: project.id,
        branch,
      });
    invariant(compareBucket && lastApprovedBucket && noChangesBucket);

    const [build, lastApprovedBuild, noChangesBuild] =
      await factory.Build.createMany(3, [
        {
          projectId: project.id,
          compareScreenshotBucketId: compareBucket.id,
          githubPullRequestId: pullRequest.id,
          name: "default",
          mode: "ci",
          mergeQueue: true,
          type: "check",
        },
        {
          projectId: project.id,
          compareScreenshotBucketId: lastApprovedBucket.id,
          githubPullRequestId: pullRequest.id,
          name: "default",
          mode: "ci",
          mergeQueue: true,
          conclusion: "changes-detected",
          type: "check",
        },
        {
          projectId: project.id,
          compareScreenshotBucketId: noChangesBucket.id,
          githubPullRequestId: pullRequest.id,
          name: "default",
          mode: "ci",
          mergeQueue: true,
          conclusion: "no-changes",
          type: "check",
        },
      ]);
    invariant(build && lastApprovedBuild && noChangesBuild);

    const [baseBucket] = await Promise.all([
      factory.ScreenshotBucket.create({
        projectId: project.id,
        branch: "main",
      }),
      lastApprovedBuild.$query().patch({
        createdAt: new Date("2024-01-01").toISOString(),
      }),
      noChangesBuild.$query().patch({
        createdAt: new Date("2024-02-01").toISOString(),
      }),
      factory.BuildReview.create({
        buildId: lastApprovedBuild.id,
        state: "approved",
      }),
    ]);

    invariant(baseBucket);

    const virtualBucket = { screenshots: [] };
    mockGetCIBase.mockResolvedValue({
      baseBucket,
      baseBranch: "main",
      baseBranchResolvedFrom: "project" as const,
    });
    mockMergeBucketWithBuildDiffs.mockResolvedValue(virtualBucket);

    const result = await getCIMergeQueueBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(mockMergeBucketWithBuildDiffs).toHaveBeenCalledOnce();
    const [, buildArg] = mockMergeBucketWithBuildDiffs.mock.calls[0]!;
    expect(buildArg.id).toBe(noChangesBuild.id);
    expect(buildArg.id).not.toBe(lastApprovedBuild.id);
    expect(result.baseBucket).toBe(virtualBucket);
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
  });

  test("merges all targeted merge queue pull requests", async ({ project }) => {
    invariant(
      project.githubRepositoryId,
      "Project should have a GitHub repository",
    );

    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "merge-queue/main",
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      githubPullRequestId: null,
      name: "default",
      mode: "ci",
      mergeQueue: true,
      type: "check",
    });

    const [targetPullRequest1, targetPullRequest2] =
      await factory.PullRequest.createMany(2, [
        { githubRepositoryId: project.githubRepositoryId, number: 10 },
        { githubRepositoryId: project.githubRepositoryId, number: 11 },
      ]);
    invariant(targetPullRequest1 && targetPullRequest2);

    await factory.BuildMergeQueueGhPullRequest.createMany(2, [
      {
        buildId: build.id,
        githubPullRequestId: targetPullRequest1.id,
      },
      {
        buildId: build.id,
        githubPullRequestId: targetPullRequest2.id,
      },
    ]);

    const [approvedBucket1, approvedBucket2] =
      await factory.ScreenshotBucket.createMany(2, [
        { projectId: project.id, branch: "feature/pr-10" },
        { projectId: project.id, branch: "feature/pr-11" },
      ]);
    invariant(approvedBucket1 && approvedBucket2);

    const [approvedBuild1, approvedBuild2] = await factory.Build.createMany(2, [
      {
        projectId: project.id,
        compareScreenshotBucketId: approvedBucket1.id,
        githubPullRequestId: targetPullRequest1.id,
        createdAt: new Date("2024-01-01").toISOString(),
        name: build.name,
        mode: "ci",
        mergeQueue: true,
        type: "check",
      },
      {
        projectId: project.id,
        compareScreenshotBucketId: approvedBucket2.id,
        githubPullRequestId: targetPullRequest2.id,
        createdAt: new Date("2024-01-02").toISOString(),
        name: build.name,
        mode: "ci",
        mergeQueue: true,
        type: "check",
      },
    ]);
    invariant(approvedBuild1 && approvedBuild2);

    await Promise.all([
      factory.BuildReview.create({
        buildId: approvedBuild1.id,
        state: "approved",
      }),
      factory.BuildReview.create({
        buildId: approvedBuild2.id,
        state: "approved",
      }),
    ]);

    const baseBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "main",
      createdAt: new Date("2023-12-31").toISOString(),
    });

    const mergedOnce = { screenshots: [] };
    const mergedTwice = { screenshots: [] };
    mockGetCIBase.mockResolvedValue({
      baseBucket,
      baseBranch: "main",
      baseBranchResolvedFrom: "project" as const,
    });
    mockMergeBucketWithBuildDiffs
      .mockResolvedValueOnce(mergedOnce)
      .mockResolvedValueOnce(mergedTwice);

    const result = await getCIMergeQueueBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(mockMergeBucketWithBuildDiffs).toHaveBeenCalledTimes(2);
    expect(mockMergeBucketWithBuildDiffs.mock.calls[0]?.[0]).toBe(baseBucket);
    expect(mockMergeBucketWithBuildDiffs.mock.calls[0]?.[1].id).toBe(
      approvedBuild1.id,
    );
    expect(mockMergeBucketWithBuildDiffs.mock.calls[1]?.[0]).toBe(mergedOnce);
    expect(mockMergeBucketWithBuildDiffs.mock.calls[1]?.[1].id).toBe(
      approvedBuild2.id,
    );
    expect(result.baseBucket).toBe(mergedTwice);
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
  });
});
