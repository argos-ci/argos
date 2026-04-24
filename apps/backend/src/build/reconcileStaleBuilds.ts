import { Build, ScreenshotDiff } from "@/database/models";

import { concludeBuild } from "./concludeBuild";

/**
 * Find builds that are complete but never got a conclusion set.
 *
 * This can happen when:
 * - The Redis lock for concludeBuild times out while 1000s of diffs complete simultaneously
 * - The process crashes after setting jobStatus=complete but before concludeBuild fires
 * - The SQS message for the final diff is dropped
 *
 * Call this periodically (e.g. every 5 minutes) to self-heal stuck builds.
 */
export async function reconcileStaleBuilds() {
  // Find builds finalized > 2 minutes ago with no conclusion
  const staleBuilds = await Build.query()
    .where("jobStatus", "complete")
    .whereNull("conclusion")
    .where("finalizedAt", "<", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .limit(50);

  if (staleBuilds.length === 0) {
    return;
  }

  // Filter to only builds where all diffs are actually complete
  const buildIds = staleBuilds.map((b) => b.id);
  const pendingDiffCounts = await ScreenshotDiff.query()
    .select("buildId")
    .count("id as count")
    .whereIn("buildId", buildIds)
    .where("jobStatus", "pending")
    .groupBy("buildId");

  const buildsWithPendingDiffs = new Set(
    pendingDiffCounts.map((row) => row.buildId),
  );

  const concludable = staleBuilds.filter(
    (b) => !buildsWithPendingDiffs.has(b.id),
  );

  if (concludable.length === 0) {
    return;
  }

  console.log(
    `[reconcileStaleBuilds] Re-concluding ${concludable.length} stale builds`,
  );

  await Promise.allSettled(
    concludable.map((build) => concludeBuild({ build })),
  );
}
