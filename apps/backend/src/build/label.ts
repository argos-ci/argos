import { assertNever } from "@argos/util/assertNever";

import { BuildAggregatedStatus, BuildType } from "@/database/models";

/**
 * Get the label for a build status.
 */
function getBuildStatusLabel(status: BuildAggregatedStatus): string {
  switch (status) {
    case "accepted":
      return "👍 Changes approved";
    case "aborted":
      return "🙅 Build aborted";
    case "diffDetected":
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
      return "👎 Changes rejected";
    case "stable":
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
    case "orphan":
      return "🔘 Orphan build";
    case "reference":
      return "✅ Auto-approved build";
    case "check": {
      return getBuildStatusLabel(status);
    }
    // eslint-disable-next-line no-fallthrough
    case null:
    case undefined:
      return getBuildStatusLabel(status);
    default:
      assertNever(type);
  }
}
