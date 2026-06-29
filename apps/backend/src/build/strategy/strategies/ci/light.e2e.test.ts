import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScreenshotBucket } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getCIBase } from "./base";

// The GitHub "light" app has no read access to the repository, so it can't
// call the GitHub API to resolve the merge base or list parent commits.
// We still need a (stub) octokit so that `getContext` succeeds.
vi.mock("@/github", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/github")>();
  return {
    ...actual,
    getInstallationOctokit: vi.fn(async () => ({}) as never),
  };
});

describe("getCIBase - GitHub Light app", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("falls back to the latest valid bucket on the base branch when the baseline is far from the merge base", async () => {
    const githubAccount = await factory.GithubAccount.create({
      login: "argos",
    });
    const githubRepository = await factory.GithubRepository.create({
      name: "repo",
      githubAccountId: githubAccount.id,
    });
    const installation = await factory.GithubInstallation.create({
      app: "light",
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: githubRepository.id,
      githubInstallationId: installation.id,
    });
    const project = await factory.Project.create({
      githubRepositoryId: githubRepository.id,
      defaultBaseBranch: "main",
    });

    // The baseline: an approved (reference) build on "main".
    // Its commit is far behind (~244 commits) and is NOT part of the parent
    // commits the CLI was able to send.
    const baseBucket = await factory.ScreenshotBucket.create({
      name: "default",
      branch: "main",
      mode: "ci",
      projectId: project.id,
      commit: "1111111111111111111111111111111111111111",
    });
    await factory.Build.create({
      projectId: project.id,
      name: "default",
      mode: "ci",
      type: "reference",
      jobStatus: "complete",
      compareScreenshotBucketId: baseBucket.id,
    });

    // The compare build on a feature branch. The CLI provided the merge-base
    // commit (no bucket exists there) and a short list of parent commits that
    // does not reach the baseline commit.
    const compareBucket = await factory.ScreenshotBucket.create({
      name: "default",
      branch: "feature",
      mode: "ci",
      projectId: project.id,
      commit: "2222222222222222222222222222222222222222",
    });
    const build = await factory.Build.create({
      projectId: project.id,
      name: "default",
      mode: "ci",
      type: "check",
      jobStatus: "pending",
      compareScreenshotBucketId: compareBucket.id,
      baseCommit: "3333333333333333333333333333333333333333",
      baseBranch: "main",
      parentCommits: [
        "2222222222222222222222222222222222222222",
        "4444444444444444444444444444444444444444",
      ],
    });

    const result = await getCIBase({
      build,
      compareScreenshotBucket: compareBucket,
      project,
      pullRequest: null,
      context: { checkIsAutoApproved: () => false },
    });

    expect(result.baseBucket).toBeInstanceOf(ScreenshotBucket);
    expect((result.baseBucket as ScreenshotBucket | null)?.id).toBe(
      baseBucket.id,
    );
  });
});
