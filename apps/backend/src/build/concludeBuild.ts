import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { triggerAndRunAutomation } from "@/automation";
import { AutomationEvents } from "@/automation/types/events";
import { job as buildNotificationJob } from "@/build-notification/job";
import { transaction } from "@/database";
import { Build, BuildNotification } from "@/database/models";
import type { BuildConclusion } from "@/database/schemas/BuildStatus";
import { redisLock } from "@/util/redis";

/**
 * Concludes the build by updating the conclusion and the stats.
 * Called when all diffs are processed.
 */
export async function concludeBuild(input: { build: Build; notify?: boolean }) {
  const { build, notify = true } = input;
  const buildId = build.id;
  return redisLock.acquire(["conclude-build", buildId], async () => {
    const existingBuild = await Build.query()
      .select("conclusion")
      .findById(buildId)
      .throwIfNotFound();
    if (existingBuild.conclusion !== null) {
      // If the build is already concluded, we don't want to update it.
      return;
    }
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
      const [updatedBuild, buildNotification] = await transaction(
        async (trx) => {
          return Promise.all([
            Build.query(trx).patchAndFetchById(
              buildId,
              getBuildData({ conclusion, stats }),
            ),
            BuildNotification.query(trx).insert({
              buildId,
              type: getNotificationType(conclusion),
              jobStatus: "pending",
            }),
          ]);
        },
      );

      await Promise.all([
        buildNotificationJob.push(buildNotification.id),
        triggerAndRunAutomation({
          projectId: build.projectId,
          message: {
            event: AutomationEvents.BuildCompleted,
            payload: { build: updatedBuild },
          },
        }),
      ]);
    } else {
      await Build.query()
        .findById(buildId)
        .patch(getBuildData({ conclusion, stats }));
    }
  });
}

function getBuildData(args: {
  conclusion: BuildConclusion;
  stats: Build["stats"];
}) {
  const { conclusion, stats } = args;
  return {
    conclusion,
    stats,
    concludedAt: new Date().toISOString(),
  };
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
