import { invariant } from "@argos/util/invariant";
import { minimatch } from "minimatch";

import { Build } from "@/database/models/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { BuildStrategy, GetBaseResult } from "../../types.js";
import { getBaseBucketForBuildAndCommit, queryBaseBucket } from "./query.js";
import { GithubStrategy } from "./strategies/github.js";
import { GitlabStrategy } from "./strategies/gitlab.js";
import { MergeBaseStrategy } from "./types.js";

/**
 * Get the bucket from a list of commits, ordered by the order of the commits.
 */
async function getBucketFromCommits(args: { shas: string[]; build: Build }) {
  if (args.shas.length === 0) {
    return null;
  }
  const bucket = await queryBaseBucket(args.build)
    .whereIn("commit", args.shas)
    .joinRaw(
      `join (values ${args.shas.map(
        (sha, index) => `('${sha}',${index})`,
      )}) as ordering(sha, rank) on commit = ordering.sha`,
    )
    .orderBy("ordering.rank")
    .first();
  return bucket ?? null;
}

const strategies: MergeBaseStrategy<any>[] = [GithubStrategy, GitlabStrategy];

/**
 * Get the base bucket for a build.
 */
async function getBase(build: Build): GetBaseResult {
  const richBuild = await build
    .$query()
    .withGraphFetched("[project,compareScreenshotBucket,pullRequest]");

  const project = richBuild.project;
  const compareScreenshotBucket = richBuild.compareScreenshotBucket;

  invariant(
    compareScreenshotBucket,
    "no compare screenshot bucket found",
    UnretryableError,
  );
  invariant(project, "no project found", UnretryableError);

  const strategy = strategies.find((s) => s.detect(project));

  // If we don't have a strategy then we could only count on referenceCommit
  // specified by the user in the build.
  if (!strategy) {
    if (richBuild.referenceCommit) {
      const baseScreenshotBucket = await getBaseBucketForBuildAndCommit(
        build,
        richBuild.referenceCommit,
      );
      return {
        baseScreenshotBucket,
        baseBranch: null,
        baseBranchResolvedFrom: null,
      };
    }

    return {
      baseScreenshotBucket: null,
      baseBranch: null,
      baseBranchResolvedFrom: null,
    };
  }

  const { baseBranch, baseBranchResolvedFrom } = await (async () => {
    if (richBuild.baseBranch) {
      return {
        baseBranch: richBuild.baseBranch,
        baseBranchResolvedFrom: richBuild.baseBranchResolvedFrom,
      };
    }

    if (richBuild.pullRequest?.baseRef) {
      return {
        baseBranch: richBuild.pullRequest.baseRef,
        baseBranchResolvedFrom: "pull-request" as const,
      };
    }

    return {
      baseBranch: await project.$getDefaultBaseBranch(),
      baseBranchResolvedFrom: "project" as const,
    };
  })();

  const head = compareScreenshotBucket.commit;

  const ctx = await strategy.getContext(project);

  if (!ctx) {
    return {
      baseScreenshotBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const mergeBaseCommitSha = await strategy.getMergeBaseCommitSha({
    project,
    ctx,
    base: baseBranch,
    head,
    build,
  });

  if (!mergeBaseCommitSha) {
    return {
      baseScreenshotBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  // If the merge base is the same as the head, then we have to found an ancestor
  // It happens when we are on the reference branch.
  if (mergeBaseCommitSha === head) {
    const shas = await strategy.listParentCommitShas({
      project,
      build,
      ctx,
      sha: mergeBaseCommitSha,
    });
    const baseScreenshotBucket = await getBucketFromCommits({
      shas: shas.slice(1),
      build: richBuild,
    });
    return {
      baseScreenshotBucket,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const mergeBaseBucket = await getBaseBucketForBuildAndCommit(
    build,
    mergeBaseCommitSha,
  );

  // A bucket exists for the merge base commit
  if (mergeBaseBucket) {
    return {
      baseScreenshotBucket: mergeBaseBucket,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  // If we don't have a bucket for the merge base commit, then we have to found an ancestor
  const shas = await strategy.listParentCommitShas({
    project,
    build,
    ctx,
    sha: mergeBaseCommitSha,
  });

  const baseScreenshotBucket = await getBucketFromCommits({
    shas: shas.slice(1),
    build: richBuild,
  });

  return {
    baseScreenshotBucket,
    baseBranch,
    baseBranchResolvedFrom,
  };
}

type CIStrategyContext = {
  checkIsReferenceBranch: (branch: string) => boolean;
};

export const CIStrategy: BuildStrategy<CIStrategyContext> = {
  detect: (build) => build.mode === "ci",
  getContext: async (build) => {
    await build.$fetchGraph("project", { skipFetched: true });
    invariant(build.project, "no project found", UnretryableError);
    const referenceBranchGlob = await build.project.$getReferenceBranchGlob();
    return {
      checkIsReferenceBranch: (branch: string) =>
        minimatch(branch, referenceBranchGlob),
    };
  },
  getBuildType: (input, ctx) => {
    if (ctx.checkIsReferenceBranch(input.compareScreenshotBucket.branch)) {
      return "reference";
    }
    if (!input.baseScreenshotBucket) {
      return "orphan";
    }
    return "check";
  },
  getBase,
};
