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
      `join (values ${args.shas
        .map((sha, index) => `('${sha}',${index})`)
        .join(",")}) as ordering(sha, rank) on commit = ordering.sha`,
    )
    .orderBy("ordering.rank")
    .orderBy("id", "desc")
    .first();
  return bucket ?? null;
}

const gitProviders: MergeBaseStrategy<any>[] = [GithubStrategy, GitlabStrategy];

/**
 * Get the base bucket for a build.
 */
async function getBase(
  build: Build,
  ciContext: CIStrategyContext,
): GetBaseResult {
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

  if (build.mergeQueue) {
    const lastApprovedBuild = await Build.query()
      .withGraphFetched("compareScreenshotBucket")
      .joinRelated("compareScreenshotBucket")
      .where("builds.projectId", build.projectId)
      .where("builds.name", build.name)
      .where("builds.mode", "ci")
      .where("builds.jobStatus", "complete")
      .whereNot("builds.id", build.id)
      .where("compareScreenshotBucket.branch", compareScreenshotBucket.branch)
      .where((qb) => {
        if (build.githubPullRequestId) {
          qb.where("builds.githubPullRequestId", build.githubPullRequestId);
        }
      })
      .whereExists(
        Build.submittedReviewQuery().where("build_reviews.state", "approved"),
      )
      .orderBy("builds.id", "desc")
      .first();

    if (lastApprovedBuild) {
      invariant(
        lastApprovedBuild.compareScreenshotBucket,
        "No compareScreenshotBucket found",
      );

      return {
        baseScreenshotBucket: lastApprovedBuild.compareScreenshotBucket,
        baseBranch: null,
        baseBranchResolvedFrom: null,
      };
    }
  }

  const gitProvider = gitProviders.find((s) => s.detect(project));

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

  // If we don't have a strategy then we could only count on baseCommit
  // specified by the user in the build.
  if (!gitProvider) {
    if (richBuild.baseCommit) {
      const baseScreenshotBucket = await getBaseBucketForBuildAndCommit(
        build,
        richBuild.baseCommit,
      );
      return {
        baseScreenshotBucket,
        baseBranch,
        baseBranchResolvedFrom,
      };
    }

    return {
      baseScreenshotBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const head = compareScreenshotBucket.commit;

  const ctx = await gitProvider.getContext(project);

  if (!ctx) {
    return {
      baseScreenshotBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const mergeBaseCommitSha =
    build.baseCommit ??
    (await gitProvider.getMergeBaseCommitSha({
      project,
      ctx,
      base: baseBranch,
      head,
      build,
    }));

  if (!mergeBaseCommitSha) {
    return {
      baseScreenshotBucket: null,
      baseBranch,
      baseBranchResolvedFrom,
    };
  }

  const isBaseBranchAutoApproved = ciContext.checkIsAutoApproved(baseBranch);

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
    {
      // If the base branch is auto-approved, then we don't need to check if the build is approved.
      // We assume that by merging the base branch, the user has approved the build.
      approved: isBaseBranchAutoApproved ? undefined : true,
    },
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
  const shas =
    build.parentCommits ??
    (await gitProvider.listParentCommitShas({
      project,
      build,
      ctx,
      sha: mergeBaseCommitSha,
    }));

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
  checkIsAutoApproved: (branch: string) => boolean;
};

export const CIStrategy: BuildStrategy<CIStrategyContext> = {
  detect: (build) => build.mode === "ci",
  getContext: async (build) => {
    await build.$fetchGraph("project", { skipFetched: true });
    invariant(build.project, "no project found", UnretryableError);
    const branchGlob = await build.project.$getAutoApprovedBranchGlob();
    return {
      checkIsAutoApproved: (branch: string) => {
        // If there is a pull request, we never auto-approve the build.
        if (build.githubPullRequestId) {
          return false;
        }

        return minimatch(branch, branchGlob);
      },
    };
  },
  getBuildType: (input, ctx) => {
    if (ctx.checkIsAutoApproved(input.compareScreenshotBucket.branch)) {
      return "reference";
    }
    if (!input.baseScreenshotBucket) {
      return "orphan";
    }
    return "check";
  },
  getBase,
};
