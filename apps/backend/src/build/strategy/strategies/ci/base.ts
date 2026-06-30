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

  const result = (baseBucket: ScreenshotBucket | null) => ({
    baseBucket,
    baseBranch,
    baseBranchResolvedFrom,
  });

  const head = compareScreenshotBucket.commit;

  // Resolve the git provider context when a provider is detected. The context
  // lets us query the provider (GitHub/GitLab) to compute the merge base and
  // list parent commits. Without a provider — or for "light" apps — we rely
  // solely on the information sent by the build (baseCommit & parentCommits).
  const ctx = gitProvider ? await gitProvider.getContext(project) : null;

  // A git provider was detected but its context could not be resolved.
  if (gitProvider && !ctx) {
    return result(null);
  }

  const mergeBaseCommitSha = await (() => {
    if (build.baseCommit) {
      return build.baseCommit;
    }
    // Without a git provider context, we can't compute a merge base from the
    // base branch, so we only rely on the build's baseCommit (handled above).
    if (!gitProvider || !ctx) {
      return null;
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

  // When a git provider is detected, a merge base commit is required to find a
  // base bucket, otherwise the build is considered an orphan.
  // When there is no git provider, we can still fall back to the build's parent
  // commits below to find a base bucket.
  if (gitProvider && !mergeBaseCommitSha) {
    return result(null);
  }

  // Lists the parent commits used to find an ancestor bucket. We prefer the
  // parent commits sent by the build (CLI), and fall back to the git provider
  // when one is available.
  const listParentCommitShas = async (sha: string): Promise<string[]> => {
    if (build.parentCommits) {
      return build.parentCommits;
    }
    if (gitProvider && ctx) {
      return gitProvider.listParentCommitShas({ project, build, ctx, sha });
    }
    return [];
  };

  // When we have a merge base commit that differs from the head, we first try
  // to find a bucket for that exact commit.
  if (mergeBaseCommitSha && mergeBaseCommitSha !== head) {
    const isBaseBranchAutoApproved = baseBranch
      ? context.checkIsAutoApproved(baseBranch)
      : false;

    const mergeBaseBucket = await getBaseBucketForBuildAndCommit(
      build,
      mergeBaseCommitSha,
      {
        // If the base branch is auto-approved, then we don't need to check if the build is approved.
        // We assume that by merging the base branch, the user has approved the build.
        approved: isBaseBranchAutoApproved ? undefined : true,
      },
    );

    // A bucket exists for the merge base commit.
    if (mergeBaseBucket) {
      return result(mergeBaseBucket);
    }
  }

  // Otherwise we have to find an ancestor. This happens when:
  // - the merge base is the same as the head (e.g. on an auto-approved branch),
  // - no bucket exists for the merge base commit,
  // - there is no merge base at all (no git provider and no baseCommit).
  const shas = await listParentCommitShas(mergeBaseCommitSha ?? head);
  const baseBucket = await getBucketFromCommits({
    shas: shas.slice(1),
    build,
  });

  return result(baseBucket);
}
