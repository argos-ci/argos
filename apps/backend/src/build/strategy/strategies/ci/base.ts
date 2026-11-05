import { invariant } from "@argos/util/invariant";

import {
  Build,
  type GithubPullRequest,
  type OriginPullRequest,
  type Project,
  type ScreenshotBucket,
} from "@/database/models";

import type { CIStrategyContext } from ".";
import type { GetBaseResult } from "../../types";
import {
  getBaseBucketForBuildAndCommit,
  getBucketFromAncestors,
  getSameCommitBaseBucket,
} from "./query";
import { GithubStrategy } from "./strategies/github";
import { GitlabStrategy } from "./strategies/gitlab";
import { OriginStrategy } from "./strategies/origin";
import type { MergeBaseStrategy } from "./types";

const gitProviders: MergeBaseStrategy<any>[] = [
  GithubStrategy,
  GitlabStrategy,
  OriginStrategy,
];

export type GetCIBaseArgs = {
  build: Build;
  compareScreenshotBucket: ScreenshotBucket;
  project: Project;
  pullRequest: GithubPullRequest | OriginPullRequest | null;
  context: CIStrategyContext;
};

/**
 * Get merge base from a CI strategy.
 */
export async function getCIBase(args: GetCIBaseArgs): GetBaseResult {
  const base = await resolveCIBase(args);

  if (base.baseBucket) {
    return base;
  }

  // No baseline was found, the build would be an orphan. As a last resort, we
  // compare with a previous approved build on the same commit and branch. This
  // happens when running Argos twice without committing (typically while
  // setting up Argos): the second build is compared with the first one instead
  // of being an orphan.
  const sameCommitBucket = await getSameCommitBaseBucket(
    args.build,
    args.compareScreenshotBucket,
  );

  return { ...base, baseBucket: sameCommitBucket };
}

/**
 * Resolve the base bucket of a build from the git history (merge base and
 * ancestor commits).
 */
async function resolveCIBase(args: GetCIBaseArgs): GetBaseResult {
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

  // Lists the commits used to find an ancestor bucket. We prefer the parent
  // commits sent by the build (CLI), and fall back to the git provider when
  // one is available.
  const listCommitPages = (
    sha: string,
  ): AsyncIterable<string[]> | Iterable<string[]> => {
    if (build.parentCommits) {
      return [build.parentCommits];
    }
    if (gitProvider && ctx) {
      return gitProvider.listCommitPages({ project, build, ctx, sha });
    }
    return [];
  };

  // On an auto-approved base branch, merging is the approval, so any build can
  // be the baseline. Anywhere else it has to be approved: a push to a base
  // branch without auto-approval walks the ancestors below, and would otherwise
  // compare with the previous push whether anyone reviewed it or not.
  const isBaseBranchAutoApproved = baseBranch
    ? context.checkIsAutoApproved(baseBranch)
    : false;
  const approved = isBaseBranchAutoApproved ? undefined : true;

  // When we have a merge base commit that differs from the head, we first try
  // to find a bucket for that exact commit.
  if (mergeBaseCommitSha && mergeBaseCommitSha !== head) {
    const mergeBaseBucket = await getBaseBucketForBuildAndCommit(
      build,
      mergeBaseCommitSha,
      // A reference commit names its baseline explicitly
      // (ARGOS_REFERENCE_COMMIT), so the build on it is trusted without
      // approval. Without a Git provider the CLI sends one too: the commit of
      // the closest approved build, or the merge base when it found none.
      { approved: build.baseCommit ? undefined : approved },
    );

    // A bucket exists for the merge base commit.
    if (mergeBaseBucket) {
      return result(mergeBaseBucket);
    }
  }

  // Otherwise we have to find an ancestor. This happens when:
  // - the merge base is the same as the head (a push to the base branch),
  // - no bucket exists for the merge base commit,
  // - there is no merge base at all (no git provider and no baseCommit).
  const baseBucket = await getBucketFromAncestors({
    pages: listCommitPages(mergeBaseCommitSha ?? head),
    build,
    approved,
  });

  return result(baseBucket);
}
