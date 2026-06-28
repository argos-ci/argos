import { raw } from "objection";

import {
  Build,
  BuildReview,
  IgnoredChange,
  ScreenshotDiff,
  ScreenshotDiffReview,
  type ScreenshotBucket,
} from "@/database/models";

type GetPreviousDiffApprovalIdsArgs = GetPreviousFilesApprovalQueryArgs;

/**
 * Get the previously approved diff ids of a specific build.
 * Optionally specify a specific user.
 */
export async function getPreviousDiffApprovalIds(
  args: GetPreviousDiffApprovalIdsArgs,
) {
  const previousApprovals = await getPreviousDiffApprovals(args);

  if (
    previousApprovals.fingerprints.size === 0 &&
    previousApprovals.compareFileIds.size === 0 &&
    previousApprovals.baseFileIds.size === 0
  ) {
    return [];
  }

  const diffs = await ScreenshotDiff.query()
    .select("screenshot_diffs.id")
    .leftJoinRelated("[compareScreenshot,baseScreenshot]")
    .where("screenshot_diffs.buildId", args.build.id)
    .where((qb) => {
      if (previousApprovals.fingerprints.size > 0) {
        qb.orWhereIn(
          "screenshot_diffs.fingerprint",
          Array.from(previousApprovals.fingerprints),
        );
      }
      if (previousApprovals.compareFileIds.size > 0) {
        qb.orWhereIn(
          "compareScreenshot.fileId",
          Array.from(previousApprovals.compareFileIds),
        );
      }
      if (previousApprovals.baseFileIds.size > 0) {
        qb.orWhereIn(
          "baseScreenshot.fileId",
          Array.from(previousApprovals.baseFileIds),
        );
      }
    });

  return diffs.map((diff) => diff.id);
}

type GetPreviousFilesApprovalQueryArgs = {
  build: Build;
  compareBucket: ScreenshotBucket;
  /**
   * If passed, reviews are filtered on this specific user id.
   */
  userId?: string;
};

/**
 * Query for builds that precede the given build on the same screenshot bucket
 * name/branch (and pull request, if any) and mode, and that detected changes.
 * These are the builds whose approvals can be reapplied to the current build.
 */
function getPreviousBuildsQuery(args: {
  build: Build;
  compareBucket: ScreenshotBucket;
}) {
  const { build, compareBucket } = args;

  const buildQuery = Build.query()
    .select("builds.id")
    .joinRelated("compareScreenshotBucket")
    .where("builds.createdAt", "<", build.createdAt)
    .where("builds.mode", build.mode)
    .where("builds.conclusion", "changes-detected")
    .where("compareScreenshotBucket.name", compareBucket.name)
    .where("compareScreenshotBucket.branch", compareBucket.branch);

  // If a pull request is specified, then only look for builds in this specific
  // pull request.
  if (build.githubPullRequestId) {
    buildQuery.where("builds.githubPullRequestId", build.githubPullRequestId);
  }

  return buildQuery;
}

/**
 * Get the distinct ids of users who approved a previous build on the same
 * branch (see {@link getPreviousBuildsQuery}). These are the candidates for an
 * automatic approval of the current build. Dismissed reviews are ignored.
 */
export async function getPreviousApproverUserIds(args: {
  build: Build;
  compareBucket: ScreenshotBucket;
}): Promise<string[]> {
  const buildQuery = getPreviousBuildsQuery(args);

  const reviews = await BuildReview.query()
    .distinct("build_reviews.userId")
    .whereIn("build_reviews.buildId", buildQuery)
    .where("build_reviews.state", "approved")
    .whereNull("build_reviews.dismissedAt")
    .whereNotNull("build_reviews.userId");

  return reviews
    .map((review) => review.userId)
    .filter((userId): userId is string => userId !== null);
}

/**
 * Get the ids of the diffs of a build that count as changes to review,
 * mirroring {@link Build.computeConclusion}: "added", "changed" and (unless the
 * build is a subset) "removed" diffs that aren't part of a parent screenshot.
 */
export async function getBuildReviewableDiffIds(
  build: Build,
): Promise<string[]> {
  const diffs = await ScreenshotDiff.query()
    .select("screenshot_diffs.id")
    .leftJoinRelated("compareScreenshot")
    .whereNull("compareScreenshot.parentName")
    .where("screenshot_diffs.buildId", build.id)
    .whereIn(
      raw(ScreenshotDiff.selectDiffStatus),
      // For subset builds, "removed" are ignored.
      build.subset ? ["added", "changed"] : ["added", "changed", "removed"],
    );

  return diffs.map((diff) => diff.id);
}

/**
 * Get the previously approved file ids.
 * Optionally specify a specific user.
 */
async function getPreviousDiffApprovals(
  args: GetPreviousFilesApprovalQueryArgs,
) {
  const { userId } = args;

  const buildQuery = getPreviousBuildsQuery(args);

  const buildReviewQuery = BuildReview.query()
    .select("build_reviews.id")
    .whereIn("build_reviews.buildId", buildQuery)
    // Never reapply a dismissed review: a dismissal explicitly revokes its
    // approvals. This also keeps matching consistent with the candidate set
    // from `getPreviousApproverUserIds`, which excludes dismissed reviews.
    .whereNull("build_reviews.dismissedAt")
    .where((qb) => {
      if (userId) {
        qb.where("build_reviews.userId", userId);
      }
    })
    .orderBy("build_reviews.createdAt", "desc")
    .limit(1);

  const diffs = await ScreenshotDiff.query()
    .withGraphFetched("[compareScreenshot,baseScreenshot]")
    .whereNotExists(
      IgnoredChange.query()
        .where("projectId", args.build.projectId)
        .whereRaw('ignored_changes."testId" = screenshot_diffs."testId"')
        .whereRaw("ignored_changes.fingerprint = screenshot_diffs.fingerprint"),
    )
    .whereIn(
      "screenshot_diffs.id",
      ScreenshotDiffReview.query()
        .select("screenshot_diff_reviews.screenshotDiffId")
        .where("screenshot_diff_reviews.state", "approved")
        .whereIn("screenshot_diff_reviews.buildReviewId", buildReviewQuery),
    );

  return diffs.reduce<{
    fingerprints: Set<string>;
    compareFileIds: Set<string>;
    baseFileIds: Set<string>;
  }>(
    (indices, diff) => {
      if (diff.fingerprint) {
        indices.fingerprints.add(diff.fingerprint);
        return indices;
      }
      if (diff.compareScreenshot) {
        if (diff.compareScreenshot.fileId) {
          indices.compareFileIds.add(diff.compareScreenshot.fileId);
        }
        return indices;
      }
      if (diff.baseScreenshot) {
        if (diff.baseScreenshot.fileId) {
          indices.baseFileIds.add(diff.baseScreenshot.fileId);
        }
        return indices;
      }
      return indices;
    },
    {
      fingerprints: new Set(),
      compareFileIds: new Set(),
      baseFileIds: new Set(),
    },
  );
}
