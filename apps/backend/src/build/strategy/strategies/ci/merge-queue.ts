import { invariant } from "@argos/util/invariant";

import { Build, ScreenshotBucket } from "@/database/models";

import type { GetBaseResult, VirtualScreenshotBucket } from "../../types";
import { getCIBase, type GetCIBaseArgs } from "./base";
import { mergeBucketWithBuildDiffs } from "./bucket-merge";

/**
 * Get the base bucket in the context of a merge queue.
 */
export async function getCIMergeQueueBase(
  args: GetCIBaseArgs,
): Promise<GetBaseResult> {
  const { build, compareScreenshotBucket } = args;
  const [ciBase, lastApprovedOrNoChangesBuilds] = await Promise.all([
    getCIBase(args),
    getLastApprovedOrNoChangesBuilds({ build, compareScreenshotBucket }),
  ]);

  // If there is no last approved build or no-changes,
  // fallback to CI base strategy.
  if (lastApprovedOrNoChangesBuilds.length === 0) {
    return ciBase;
  }

  const initialBaseBucket = await getInitialBaseBucket({
    build,
    compareScreenshotBucket,
    ciBaseBucket: ciBase.baseBucket,
    lastApprovedOrNoChangesBuilds,
  });

  let virtualBaseBucket: ScreenshotBucket | VirtualScreenshotBucket =
    initialBaseBucket;
  for (const [
    index,
    approvedBuild,
  ] of lastApprovedOrNoChangesBuilds.entries()) {
    if (
      index === 0 &&
      virtualBaseBucket === approvedBuild.compareScreenshotBucket
    ) {
      continue;
    }
    virtualBaseBucket = await mergeBucketWithBuildDiffs(
      virtualBaseBucket,
      approvedBuild,
    );
  }

  return {
    baseBucket: virtualBaseBucket,
    baseBranch: null,
    baseBranchResolvedFrom: null,
  };
}

async function getLastApprovedOrNoChangesBuilds(args: {
  build: Build;
  compareScreenshotBucket: ScreenshotBucket;
}): Promise<Build[]> {
  const { build, compareScreenshotBucket } = args;
  const targetPullRequestIds = await getTargetPullRequestIds(build);

  const latestBuildIdsQuery = Build.query()
    .select("builds.id")
    .joinRelated("compareScreenshotBucket")
    .where("builds.projectId", build.projectId)
    .where("builds.name", build.name)
    .where("builds.mode", "ci")
    .where("builds.jobStatus", "complete")
    .whereNot("builds.type", "skipped")
    .whereNot("builds.id", build.id)
    .where((qb) => {
      if (targetPullRequestIds.length > 0) {
        qb.whereIn("builds.githubPullRequestId", targetPullRequestIds);
      }
    })
    .where((qb) => {
      // Legacy GitHub merge queue builds still target a single PR on the merge
      // queue branch, while aggregate merge queue builds point to multiple PR
      // branches and must not be constrained to the queue branch.
      if (targetPullRequestIds.length === 1) {
        qb.where(
          "compareScreenshotBucket.branch",
          compareScreenshotBucket.branch,
        );
      }
    })
    .where((qb) => {
      qb.whereExists(
        Build.submittedReviewQuery().where("build_reviews.state", "approved"),
      ).orWhere("builds.conclusion", "no-changes");
    })
    .distinctOn("builds.githubPullRequestId")
    .orderBy("builds.githubPullRequestId")
    .orderBy("builds.id", "desc");

  return Build.query()
    .withGraphJoined("compareScreenshotBucket")
    .whereIn("builds.id", latestBuildIdsQuery)
    .orderBy("builds.id", "asc");
}

async function getTargetPullRequestIds(build: Build): Promise<string[]> {
  if (build.mergeQueueGhPullRequests) {
    return build.mergeQueueGhPullRequests.map((pr) => pr.githubPullRequestId);
  }

  const mergeQueuePullRequests = await build.$relatedQuery(
    "mergeQueueGhPullRequests",
  );

  if (mergeQueuePullRequests.length > 0) {
    return mergeQueuePullRequests.map((pr) => pr.githubPullRequestId);
  }

  if (!build.githubPullRequestId) {
    return [];
  }

  return [build.githubPullRequestId];
}

async function getInitialBaseBucket(args: {
  build: Build;
  compareScreenshotBucket: ScreenshotBucket;
  ciBaseBucket: ScreenshotBucket | VirtualScreenshotBucket | null;
  lastApprovedOrNoChangesBuilds: Build[];
}): Promise<ScreenshotBucket> {
  const {
    build,
    compareScreenshotBucket,
    ciBaseBucket,
    lastApprovedOrNoChangesBuilds,
  } = args;

  if (ciBaseBucket instanceof ScreenshotBucket) {
    const recentlyMergedBucket = await getRecentMergedBucket({
      build,
      compareScreenshotBucket,
      baseBucket: ciBaseBucket,
    });

    return recentlyMergedBucket ?? ciBaseBucket;
  }

  const firstApprovedBuild = lastApprovedOrNoChangesBuilds[0];
  invariant(firstApprovedBuild, "Approved build should exist");
  invariant(
    firstApprovedBuild.compareScreenshotBucket,
    "Relation `compareScreenshotBucket` not loaded",
  );

  return firstApprovedBuild.compareScreenshotBucket;
}

/**
 * Retrieve a bucket that has been merged after the base bucket.
 */
async function getRecentMergedBucket(args: {
  build: Build;
  compareScreenshotBucket: ScreenshotBucket;
  baseBucket: ScreenshotBucket;
}) {
  const { build, compareScreenshotBucket, baseBucket } = args;
  const recentlyMergedBuild = await Build.query()
    .withGraphFetched("compareScreenshotBucket")
    .joinRelated("compareScreenshotBucket")
    .where("builds.projectId", build.projectId)
    .where("builds.name", build.name)
    .where("builds.mode", "ci")
    .where("builds.jobStatus", "complete")
    .whereNot("builds.id", build.id)
    .where("compareScreenshotBucket.branch", compareScreenshotBucket.branch)
    .where("builds.mergeQueue", true)
    .where("builds.createdAt", ">", baseBucket.createdAt)
    .where("builds.conclusion", "no-changes")
    .orderBy("builds.id", "desc")
    .first();

  if (!recentlyMergedBuild) {
    return null;
  }
  invariant(
    recentlyMergedBuild.compareScreenshotBucket,
    "Relation `compareScreenshotBucket` not loaded",
  );
  return recentlyMergedBuild.compareScreenshotBucket;
}
