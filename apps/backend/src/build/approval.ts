import {
  Build,
  BuildReview,
  IgnoredFile,
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
      IgnoredFile.query()
        .where("projectId", args.build.projectId)
        .whereRaw('ignored_files."testId" = screenshot_diffs."testId"')
        .whereRaw('ignored_files."fileId" = screenshot_diffs."fileId"'),
    )
    .whereIn(
      "screenshot_diffs.id",
      ScreenshotDiffReview.query()
        .select("screenshot_diff_reviews.screenshotDiffId")
        .where("screenshot_diff_reviews.state", "approved")
        .whereIn("screenshot_diff_reviews.buildReviewId", buildReviewQuery),
    );

  return diffs.reduce<{
    compareScreenshotIds: Set<string>;
    compareFileIds: Set<string>;
    baseScreenshotIds: Set<string>;
    baseFileIds: Set<string>;
  }>(
    (indices, diff) => {
      if (diff.compareScreenshot) {
        indices.compareScreenshotIds.add(diff.compareScreenshot.id);
        if (diff.compareScreenshot.fileId) {
          indices.compareFileIds.add(diff.compareScreenshot.fileId);
        }
        return indices;
      }
      if (diff.baseScreenshot) {
        indices.baseScreenshotIds.add(diff.baseScreenshot.id);
        if (diff.baseScreenshot.fileId) {
          indices.baseFileIds.add(diff.baseScreenshot.fileId);
        }
        return indices;
      }
      return indices;
    },
    {
      compareScreenshotIds: new Set(),
      compareFileIds: new Set(),
      baseScreenshotIds: new Set(),
      baseFileIds: new Set(),
    },
  );
}
