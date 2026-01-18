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
 * Get the previously approved file ids.
 * Optionally specify a specific user.
 */
async function getPreviousDiffApprovals(
  args: GetPreviousFilesApprovalQueryArgs,
) {
  const { build, compareBucket, userId } = args;

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

  const buildReviewQuery = BuildReview.query()
    .select("build_reviews.id")
    .whereIn("build_reviews.buildId", buildQuery)
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
