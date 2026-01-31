import { invariant } from "@argos/util/invariant";

import {
  Build,
  type GithubPullRequest,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";

import type { CIStrategyContext } from ".";
import type { GetBaseResult } from "../../types";
import { getBaseBucketForBuildAndCommit, getBucketFromCommits } from "./query";
import { GithubStrategy } from "./strategies/github";
import { GitlabStrategy } from "./strategies/gitlab";
import type { MergeBaseStrategy } from "./types";

const gitProviders: MergeBaseStrategy<any>[] = [GithubStrategy, GitlabStrategy];

export type GetCIBaseArgs = {
  build: Build;
  compareScreenshotBucket: ScreenshotBucket;
  project: Project;
  pullRequest: GithubPullRequest | null;
  context: CIStrategyContext;
};

/**
 * Get merge base from a CI strategy.
 */
export async function getCIBase(args: GetCIBaseArgs): GetBaseResult {
  const { build, compareScreenshotBucket, project, pullRequest, context } =
    args;

  const gitProvider = gitProviders.find((s) => s.detect(project));

  const { baseBranch, baseBranchResolvedFrom } = await (async () => {
    if (build.baseBranch) {
      return {
        baseBranch: build.baseBranch,
        baseBranchResolvedFrom: build.baseBranchResolvedFrom,
      };
    }

    // If we have only a baseCommit set without a baseBranch,
    // then we return null for baseBranch and let the frontend display the commit.
    if (build.baseCommit) {
      return {
        baseBranch: null,
        baseBranchResolvedFrom: null,
      };
    }

    if (pullRequest?.baseRef) {
      return {
        baseBranch: pullRequest.baseRef,
        baseBranchResolvedFrom: "pull-request" as const,
      };
    }

    return {
      baseBranch: await project.$getDefaultBaseBranch(),
      baseBranchResolvedFrom: "project" as const,
    };
  })();

  // If we don't have a strategy then we could only count on baseCommit
  // specified by the user in the build.
  if (!gitProvider) {
    if (build.baseCommit) {
      const baseBucket = await getBaseBucketForBuildAndCommit(
        build,
        build.baseCommit,
      );
      return {
        baseBucket,
        baseBranch,
        baseBranchResolvedFrom,
      };
    }

    return {
      baseBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const head = compareScreenshotBucket.commit;

  const ctx = await gitProvider.getContext(project);

  if (!ctx) {
    return {
      baseBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const mergeBaseCommitSha = await (() => {
    if (build.baseCommit) {
      return build.baseCommit;
    }
    invariant(
      baseBranch,
      "A branch should be specified always if there is no base commit set",
    );
    return gitProvider.getMergeBaseCommitSha({
      project,
      ctx,
      base: baseBranch,
      head,
      build,
    });
  })();

  if (!mergeBaseCommitSha) {
    return {
      baseBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const isBaseBranchAutoApproved = baseBranch
    ? context.checkIsAutoApproved(baseBranch)
    : false;

  // If the merge base is the same as the head, then we have to found an ancestor
  // It happens when we are on a auto-approved branch.
  if (mergeBaseCommitSha === head) {
    const shas =
      build.parentCommits ??
      (await gitProvider.listParentCommitShas({
        project,
        build,
        ctx,
        sha: mergeBaseCommitSha,
      }));
    const baseBucket = await getBucketFromCommits({
      shas: shas.slice(1),
      build,
    });
    return {
      baseBucket,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const mergeBaseBucket = await getBaseBucketForBuildAndCommit(
    build,
    mergeBaseCommitSha,
    {
      // If the base branch is auto-approved, then we don't need to check if the build is approved.
      // We assume that by merging the base branch, the user has approved the build.
      approved: isBaseBranchAutoApproved ? undefined : true,
    },
  );

  // A bucket exists for the merge base commit
  if (mergeBaseBucket) {
    return {
      baseBucket: mergeBaseBucket,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  // If we don't have a bucket for the merge base commit, then we have to found an ancestor
  const shas =
    build.parentCommits ??
    (await gitProvider.listParentCommitShas({
      project,
      build,
      ctx,
      sha: mergeBaseCommitSha,
    }));

  const baseBucket = await getBucketFromCommits({
    shas: shas.slice(1),
    build,
  });

  return {
    baseBucket,
    baseBranch,
    baseBranchResolvedFrom,
  };
}
