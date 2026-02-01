import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { getCIBase } from "./base";
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

describe("#getCIMergeQueueBase", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  it("falls back to CI base when no approved build exists", async () => {
    const project = await factory.Project.create();
    const branch = "feature/fallback";
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      name: "default",
      mode: "ci",
      mergeQueue: true,
    });

    const ciBaseResult = {
      baseBucket: null,
      baseBranch: "main",
      baseBranchResolvedFrom: "project" as const,
    };

    mockGetCIBase.mockResolvedValue(ciBaseResult);

    const result = await getCIMergeQueueBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(result).toEqual(ciBaseResult);
    expect(mockMergeBucketWithBuildDiffs).not.toHaveBeenCalled();
  });

  it("returns the last approved bucket when CI base does not exist", async () => {
    const project = await factory.Project.create();
    const branch = "feature/approved";
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      name: "default",
      mode: "ci",
      mergeQueue: true,
    });

    const approvedBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const lastApprovedBuild = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: approvedBucket.id,
      name: build.name,
      mode: "ci",
      mergeQueue: true,
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

  it("merges the CI base bucket with the latest merge queue bucket", async () => {
    const project = await factory.Project.create();
    const branch = "feature/merge-queue";
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch,
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
      name: "default",
      mode: "ci",
      mergeQueue: true,
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
      name: build.name,
      mode: "ci",
      mergeQueue: true,
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
    expect(bucketArg.id).toBe(recentlyMergedBucket.id);
    expect(buildArg.id).toBe(lastApprovedBuild.id);
    expect(result.baseBucket).toBe(virtualBucket);
    expect(result.baseBranch).toBeNull();
    expect(result.baseBranchResolvedFrom).toBeNull();
  });

  it('uses the latest "no-changes" build instead of the latest approved one', async () => {
    const project = await factory.Project.create();
    const branch = "feature/no-changes-latest";
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
          name: "default",
          mode: "ci",
          mergeQueue: true,
        },
        {
          projectId: project.id,
          compareScreenshotBucketId: lastApprovedBucket.id,
          name: "default",
          mode: "ci",
          mergeQueue: true,
          conclusion: "changes-detected",
        },
        {
          projectId: project.id,
          compareScreenshotBucketId: noChangesBucket.id,
          name: "default",
          mode: "ci",
          mergeQueue: true,
          conclusion: "no-changes",
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
});
