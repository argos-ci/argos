import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { job as buildNotificationJob } from "@/build-notification/job.js";
import { transaction } from "@/database/index.js";
import { Build, BuildConclusion, BuildNotification } from "@/database/models";

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
  const [, buildNotification] = await transaction(async (trx) => {
    return Promise.all([
      Build.query(trx).findById(buildId).patch({
        conclusion,
        stats,
      }),
      notify
        ? BuildNotification.query(trx).insert({
            buildId,
            type: getNotificationType(conclusion),
            jobStatus: "pending",
          })
        : null,
    ]);
  });
  if (buildNotification) {
    await buildNotificationJob.push(buildNotification.id);
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
