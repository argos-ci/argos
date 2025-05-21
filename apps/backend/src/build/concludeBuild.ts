import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { job as buildNotificationJob } from "@/build-notification/job.js";
import { transaction } from "@/database/index.js";
import { Build, BuildConclusion, BuildNotification } from "@/database/models/index.js"; // Ensure Build is fully imported
import { sendNotification } from "@/notification/index.js"; // Import sendNotification

/**
 * Concludes the build by updating the conclusion and the stats.
 * Called when all diffs are processed.
 */
export async function concludeBuild(input: {
  buildId: string;
  notify?: boolean;
}) {
  const { buildId, notify = true } = input;
  const statuses = await Build.getScreenshotDiffsStatuses([buildId]);
  const [[conclusion], [stats]] = await Promise.all([
    Build.computeConclusions([buildId], statuses),
    Build.computeStats([buildId]),
  ]);
  invariant(stats !== undefined, "No stats found");
  invariant(conclusion !== undefined, "No conclusion found");
  // If the build is not yet concluded, we don't want to update it.
  if (conclusion === null) {
    return;
  }
  if (notify) {
    const build = await Build.query().findById(buildId).withGraphFetched('[project.account, commit, baseScreenshotBucket, compareScreenshotBucket, latestScreenshotDiffs]');
    invariant(build, `Build with id "${buildId}" not found`);
    invariant(build.project, "Build project not found");
    invariant(build.project.account, "Build project account not found");

    const [, buildNotification] = await transaction(async (trx) => {
      const patchedBuild = await Build.query(trx).findById(buildId).patch({
        conclusion,
        stats,
      }).returning('*'); // Return the patched build to use its data if needed, though 'build' above should be fresh enough

      const prNotification = await BuildNotification.query(trx).insert({
        buildId,
        type: getNotificationType(conclusion),
        jobStatus: "pending",
      });

      // New: Send 'build_report' notification to project owners
      const ownerIds = await build.project.account.$getOwnerIds();
      if (ownerIds.length > 0) {
        const buildUrl = await build.getUrl(); // Assuming getUrl() exists and gives the full URL
        const notificationData = {
          projectId: build.projectId,
          buildId: build.id,
          buildName: build.name,
          buildUrl: buildUrl,
          buildType: build.type,
          conclusion: conclusion, // Use the determined conclusion
          stats: stats, // Use the determined stats
          projectName: build.project.name,
          projectSlug: build.project.account.slug, // Assuming account slug is used as project slug for URL context
          isReferenceBuild: build.type === 'reference',
          // Pass any other relevant data from 'build' that handlers might need
          // e.g., commit message, branch name, etc.
          // commitMessage: build.commit?.message,
          // branchName: build.branch,
        };

        await sendNotification({
          type: 'build_report',
          recipients: ownerIds,
          data: notificationData,
          trx, // Pass the transaction object
        });
      }
      return [patchedBuild, prNotification];
    });
    await buildNotificationJob.push(buildNotification.id);
  } else {
    // Fetch the build before patching if not already fetched or if data is stale
    await Build.query().findById(buildId).patch({
      conclusion,
      stats,
    });
  }
}

function getNotificationType(conclusion: BuildConclusion) {
  switch (conclusion) {
    case "changes-detected":
      return "diff-detected";
    case "no-changes":
      return "no-diff-detected";
    default:
      return assertNever(conclusion);
  }
}
