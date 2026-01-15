import { invariant } from "@argos/util/invariant";

import { Build, ScreenshotBucket } from "@/database/models";

import type { GetBaseResult } from "../../types";
import { getCIBase, type GetCIBaseArgs } from "./base";
import { mergeBucketWithBuildDiffs } from "./bucket-merge";

/**
 * Get the base bucket in the context of a merge queue.
 */
export async function getCIMergeQueueBase(
  args: GetCIBaseArgs,
): Promise<GetBaseResult> {
  const { build, compareScreenshotBucket } = args;
  const [ciBase, lastApprovedBuild] = await Promise.all([
    getCIBase(args),
    Build.query()
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
      .first(),
  ]);

  // If there is no last approved build,
  // fallback to CI base strategy
  if (!lastApprovedBuild) {
    return ciBase;
  }

  // If we have a base bucket found in the CI strategy,
  // we will see if there is more recent one from merge queue,
  // and merge the two buckets.
  if (ciBase.baseBucket instanceof ScreenshotBucket) {
    invariant(
      lastApprovedBuild.compareScreenshotBucket,
      'Relation "compareScreenshotBucket" should be loaded',
    );

    // If the base bucket is more recent than the latest approved build, then use it.
    if (
      new Date(ciBase.baseBucket.createdAt).getTime() >
      new Date(lastApprovedBuild.compareScreenshotBucket.createdAt).getTime()
    ) {
      return ciBase;
    }

    const recentlyMergedBucket = await getRecentMergedBucket({
      build,
      compareScreenshotBucket,
      baseBucket: ciBase.baseBucket,
    });

    const baseBucket = recentlyMergedBucket ?? ciBase.baseBucket;
    const virtualBaseBucket = await mergeBucketWithBuildDiffs(
      baseBucket,
      lastApprovedBuild,
    );
    return {
      baseBucket: virtualBaseBucket,
      baseBranch: null,
      baseBranchResolvedFrom: null,
    };
  }

  invariant(
    lastApprovedBuild.compareScreenshotBucket,
    "Relation `compareScreenshotBucket` not loaded",
  );

  return {
    baseBucket: lastApprovedBuild.compareScreenshotBucket,
    baseBranch: null,
    baseBranchResolvedFrom: null,
  };
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
