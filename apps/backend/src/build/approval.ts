import { raw, type QueryBuilder } from "objection";

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
    // Ignored diffs are not part of the review, so they never count as a
    // previously-approved change — even when their fingerprint or file matches
    // a prior approval.
    .where("screenshot_diffs.ignored", false)
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

type PreviousBuildsScope = {
  build: Build;
  compareBucket: ScreenshotBucket;
  /**
   * Pre-resolved ids of the previous builds (see {@link getPreviousBuildIds}).
   * When omitted, they are resolved lazily as a subquery. Pass this to avoid
   * re-running the lookup once per user.
   */
  previousBuildIds?: string[];
};

type GetPreviousFilesApprovalQueryArgs = PreviousBuildsScope & {
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
    // Scope to the current build's project. Bucket names ("default", …) are
    // only unique within a project, so without this a build could inherit
    // approvals from a same-named build in another project — and therefore
    // another team. Scoping by project keeps automatic reviews isolated per
    // project and per team.
    .where("builds.projectId", build.projectId)
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
 * Resolve the previous builds (see {@link getPreviousBuildsQuery}) to a concrete
 * list of ids. Resolving once and passing the result through
 * {@link PreviousBuildsScope.previousBuildIds} avoids re-running the same
 * subquery for every candidate user.
 */
export async function getPreviousBuildIds(args: {
  build: Build;
  compareBucket: ScreenshotBucket;
}): Promise<string[]> {
  const builds = await getPreviousBuildsQuery(args);
  return builds.map((build) => build.id);
}

/**
 * Restrict a BuildReview query to reviews on the previous builds, matching
 * against either the pre-resolved id list or a lazy subquery.
 */
function whereInPreviousBuilds<R>(
  qb: QueryBuilder<BuildReview, R>,
  args: PreviousBuildsScope,
): QueryBuilder<BuildReview, R> {
  return args.previousBuildIds
    ? qb.whereIn("build_reviews.buildId", args.previousBuildIds)
    : qb.whereIn("build_reviews.buildId", getPreviousBuildsQuery(args));
}

/**
 * Get the distinct ids of users who approved a previous build on the same
 * branch (see {@link getPreviousBuildsQuery}). These are the candidates for an
 * automatic approval of the current build. Dismissed reviews are ignored.
 */
export async function getPreviousApproverUserIds(
  args: PreviousBuildsScope,
): Promise<string[]> {
  const reviews = await whereInPreviousBuilds(
    BuildReview.query().distinct("build_reviews.userId"),
    args,
  )
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

  const buildReviewQuery = whereInPreviousBuilds(
    BuildReview.query().select("build_reviews.id"),
    args,
  )
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
