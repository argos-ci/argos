import { assertNever } from "@argos/util/assertNever";

import { BuildAggregatedStatus, BuildType } from "@/database/models";

export function getApprovalEmoji(state: "approved" | "rejected") {
  switch (state) {
    case "approved":
      return "👍";
    case "rejected":
      return "👎";
    default:
      assertNever(state, "Unknown approval state");
  }
}

/**
 * Get the label for a build status.
 */
function getBuildStatusLabel(status: BuildAggregatedStatus): string {
  switch (status) {
    case "accepted":
      return `${getApprovalEmoji("approved")} Changes approved`;
    case "aborted":
      return "🙅 Build aborted";
    case "changes-detected":
      return "⚠️ Changes detected";
    case "error":
      return "❌ An error happened";
    case "expired":
      return "❌ Build expired";
    case "pending":
      return "📭 Waiting for screenshots";
    case "progress":
      return "🚜 Diffing screenshots";
    case "rejected":
      return `${getApprovalEmoji("rejected")} Changes rejected`;
    case "no-changes":
      return "✅ No changes detected";
    default:
      assertNever(status);
  }
}

/**
 * Get the label for a build for a given status and type.
 */
export function getBuildLabel(
  type: BuildType | null,
  status: BuildAggregatedStatus,
): string {
  switch (type) {
    case "skipped":
      return "⚪️ Skipped build";
    case "orphan":
      return "🔵 Orphan build";
    case "reference":
      return "✅ Auto-approved build";
    case "check":
      return getBuildStatusLabel(status);
    case null:
    case undefined:
      return getBuildStatusLabel(status);
    default:
      assertNever(type);
  }
}
