import { raw, type QueryBuilder } from "objection";

import {
  BuildReview,
  IgnoredChange,
  ScreenshotDiff,
  ScreenshotDiffReview,
  type Build,
  type ScreenshotBucket,
} from "@/database/models";

import { queryBuildLineage } from "./lineage";

type GetPreviousDiffApprovalIdsArgs = GetPreviousFilesApprovalQueryArgs;

type ApprovalKeyRow = {
  id: string;
  testId: string | null;
  fingerprint: string | null;
  compareScreenshotId: string | null;
  compareFileId: string | null;
  baseFileId: string | null;
};

function getCompareKey(diff: ApprovalKeyRow): string | null {
  return diff.compareFileId
    ? `compare:${diff.testId}:${diff.compareFileId}`
    : null;
}

/**
 * The change a diff stands for, as a previous approval can cover it: its
 * fingerprint, else the file it shows, else the file it removes. Always on the
 * same test, as ignored changes are: an iris fingerprint keeps the shape of a
 * change but not where it is, so it matches changes on unrelated pages.
 */
function getApprovalKey(diff: ApprovalKeyRow): string | null {
  if (diff.fingerprint) {
    return `fingerprint:${diff.testId}:${diff.fingerprint}`;
  }
  if (diff.compareScreenshotId) {
    return getCompareKey(diff);
  }
  return diff.baseFileId ? `removal:${diff.testId}:${diff.baseFileId}` : null;
}

function selectApprovalKeyRows() {
  return ScreenshotDiff.query()
    .select(
      "screenshot_diffs.id",
      "screenshot_diffs.testId",
      "screenshot_diffs.fingerprint",
      "screenshot_diffs.compareScreenshotId",
      "compareScreenshot.fileId as compareFileId",
      "baseScreenshot.fileId as baseFileId",
    )
    .leftJoinRelated("[compareScreenshot,baseScreenshot]")
    .castTo<ApprovalKeyRow[]>();
}

/**
 * Get the previously approved diff ids of a specific build.
 * Optionally specify a specific user.
 */
export async function getPreviousDiffApprovalIds(
  args: GetPreviousDiffApprovalIdsArgs,
) {
  const approvals = await getPreviousDiffApprovals(args);

  if (approvals.length === 0) {
    return [];
  }

  const approvedKeys = new Set(
    approvals.map(getApprovalKey).filter((key) => key !== null),
  );
  const fingerprints = approvals.flatMap((diff) => diff.fingerprint ?? []);
  const fileIds = approvals.flatMap(
    (diff) => diff.compareFileId ?? diff.baseFileId ?? [],
  );

  const diffs = await selectApprovalKeyRows()
    .where("screenshot_diffs.buildId", args.build.id)
    // Ignored diffs are not part of the review, so they never count as a
    // previously-approved change — even when their fingerprint or file matches
    // a prior approval.
    .where("screenshot_diffs.ignored", false)
    // Narrows the build's diffs to candidates; the keys below decide.
    .where((qb) => {
      qb.whereIn("screenshot_diffs.fingerprint", fingerprints)
        .orWhereIn("compareScreenshot.fileId", fileIds)
        .orWhereIn("baseScreenshot.fileId", fileIds);
    });

  // A diff with a fingerprint is also covered by an approval of the same
  // screenshot file made without one.
  return diffs
    .filter((diff) =>
      [getApprovalKey(diff), getCompareKey(diff)].some(
        (key) => key !== null && approvedKeys.has(key),
      ),
    )
    .map((diff) => diff.id);
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
 * Query for the builds of the same lineage (see {@link queryBuildLineage})
 * that precede the given build and detected changes. These are the builds
 * whose approvals can be reapplied to the current build.
 */
function getPreviousBuildsQuery(args: {
  build: Build;
  compareBucket: ScreenshotBucket;
}) {
  return queryBuildLineage(args)
    .select("builds.id")
    .where("builds.createdAt", "<", args.build.createdAt)
    .where("builds.conclusion", "changes-detected");
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
 * Get the previously approved diffs, as their approval keys are read (see
 * {@link getApprovalKey}). Optionally specify a specific user.
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

  const diffs = await selectApprovalKeyRows()
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

  return diffs;
}
