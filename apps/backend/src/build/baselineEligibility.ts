import type { Build } from "@/database/models";

/**
 * Reasons why a build is not eligible to be used as a baseline.
 *
 * These mirror the intrinsic (per-build) criteria applied by the baseline
 * selection query in `strategy/strategies/ci/query.ts`. The remaining criteria
 * (same build name and commit ancestry) depend on the build being compared
 * against, so they cannot be evaluated for a build in isolation.
 */
export type BuildBaselineIneligibilityReason =
  | "build-incomplete"
  | "tests-failed"
  | "subset"
  | "rejected"
  | "not-approved";

export type BuildBaselineEligibility = {
  eligible: boolean;
  reasons: BuildBaselineIneligibilityReason[];
};

/**
 * Compute whether a build is eligible to be used as a baseline by a future
 * build.
 *
 * A build is eligible when ALL of the following are true:
 * - The build is complete.
 * - All framework tests passed (the compare bucket is valid).
 * - The build is not marked as a subset.
 * - The build has no active (non-dismissed) rejection.
 * - The build is auto-approved (reference), manually approved (an accepted
 *   review or a merged pull request), or an orphan.
 *
 * A rejection vetoes eligibility regardless of the build type, mirroring the
 * baseline-selection query which never picks a rejected build.
 *
 * @see {@link file://./strategy/strategies/ci/query.ts} for the matching query.
 */
export function getBuildBaselineEligibility(args: {
  build: Pick<Build, "jobStatus" | "subset" | "type">;
  /** Whether the compare screenshot bucket is valid (framework tests passed). */
  valid: boolean;
  /** Whether the build has an active (non-dismissed) rejection. */
  rejected: boolean;
  /** Whether the build has an accepted review. */
  hasAcceptedReview: boolean;
  /** Whether the build is attached to a merged pull request. */
  hasMergedPullRequest: boolean;
}): BuildBaselineEligibility {
  const { build } = args;

  // Until the build is complete, its eligibility cannot be determined.
  if (build.jobStatus !== "complete") {
    return { eligible: false, reasons: ["build-incomplete"] };
  }

  const reasons: BuildBaselineIneligibilityReason[] = [];

  if (!args.valid) {
    reasons.push("tests-failed");
  }

  if (build.subset) {
    reasons.push("subset");
  }

  // A rejection blocks the build whatever its type, so it takes precedence over
  // the approval check (which would otherwise pass for reference/orphan builds).
  if (args.rejected) {
    reasons.push("rejected");
  } else {
    const approved =
      build.type === "reference" ||
      build.type === "orphan" ||
      (build.type === "check" &&
        (args.hasAcceptedReview || args.hasMergedPullRequest));

    if (!approved) {
      reasons.push("not-approved");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
