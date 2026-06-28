import {
  BuildReview,
  type Build,
  type ScreenshotBucket,
} from "@/database/models";

import {
  getBuildReviewableDiffIds,
  getPreviousApproverUserIds,
  getPreviousBuildIds,
  getPreviousDiffApprovalIds,
} from "./approval";
import { createBuildReview } from "./createBuildReview";

/**
 * Automatically approve a freshly concluded build on behalf of every user whose
 * previous approvals (on a prior build of the same branch/PR) already cover all
 * of the build's changes.
 *
 * This is the server-side counterpart of the "Reapply previous approvals"
 * dialog: instead of asking a user to reapply their approvals when they open
 * the build, we submit the approval for them as soon as the build concludes —
 * but only when *all* changes match, so a human still reviews anything new.
 *
 * The created reviews are flagged as `automatic` and submitted silently (no
 * subscriber emails). They still update the build status so the build passes.
 */
export async function autoApproveBuild(input: {
  build: Build;
  /** The build's compare screenshot bucket, passed in to avoid re-fetching. */
  compareScreenshotBucket: ScreenshotBucket;
}): Promise<void> {
  const { build, compareScreenshotBucket: compareBucket } = input;

  // Only builds that detected changes can be approved. Merge queue builds have
  // their own flow and are excluded (mirroring the reapply dialog).
  if (build.conclusion !== "changes-detected" || build.mergeQueue) {
    return;
  }

  // Reapplying approvals only makes sense within a branch's history.
  if (!compareBucket.branch) {
    return;
  }

  const reviewableDiffIds = await getBuildReviewableDiffIds(build);
  if (reviewableDiffIds.length === 0) {
    return;
  }

  // Resolve the previous builds once and reuse the ids for every candidate user
  // instead of re-running the lookup per user.
  const previousBuildIds = await getPreviousBuildIds({ build, compareBucket });
  if (previousBuildIds.length === 0) {
    return;
  }

  const approverUserIds = await getPreviousApproverUserIds({
    build,
    compareBucket,
    previousBuildIds,
  });
  if (approverUserIds.length === 0) {
    return;
  }

  // Never override a decision a user already made on this build: skip anyone
  // who already has a review (e.g. they manually rejected the build before it
  // concluded). An automatic approval would otherwise become their latest
  // review and silently flip their rejection.
  const existingReviewerIds = new Set(
    (
      await BuildReview.query()
        .select("userId")
        .where("buildId", build.id)
        .whereNotNull("userId")
    ).map((review) => review.userId),
  );

  for (const userId of approverUserIds) {
    if (existingReviewerIds.has(userId)) {
      continue;
    }

    const approvedDiffIds = await getPreviousDiffApprovalIds({
      build,
      compareBucket,
      previousBuildIds,
      userId,
    });
    const approvedDiffIdSet = new Set(approvedDiffIds);

    // The user's previous approvals must cover *every* change in this build,
    // otherwise a human still needs to review the unmatched diffs.
    const coversAllChanges = reviewableDiffIds.every((diffId) =>
      approvedDiffIdSet.has(diffId),
    );

    if (!coversAllChanges) {
      continue;
    }

    await createBuildReview({
      build,
      userId,
      event: "APPROVE",
      automatic: true,
      snapshotReviews: reviewableDiffIds.map((screenshotDiffId) => ({
        screenshotDiffId,
        state: "approved",
      })),
    });
  }
}
