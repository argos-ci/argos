import type { BuildAggregatedStatus } from "@argos/schemas/build-status";

/**
 * Whether a build is in a state where a review can be submitted. Mirrors the
 * statuses the frontend offers "Submit review" for; outside these, attaching a
 * comment to a pending review would strand it with no way to submit.
 */
export function isReviewableBuildStatus(
  status: BuildAggregatedStatus,
): boolean {
  return (
    status === "accepted" ||
    status === "rejected" ||
    status === "changes-detected"
  );
}
