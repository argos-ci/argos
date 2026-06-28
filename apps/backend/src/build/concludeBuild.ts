import { AutomationEvents } from "@argos/schemas/automation-event";
import type { BuildConclusion } from "@argos/schemas/build-status";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";

import { triggerAndRunAutomation } from "@/automation";
import { job as buildNotificationJob } from "@/build-notification/job";
import { transaction } from "@/database";
import { Build, BuildNotification } from "@/database/models";
import { redisLock } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";

import { autoApproveBuild } from "./autoApproveBuild";

// Diff IDs published by each caller are pooled in this Redis set so the
// single coalesced execution can treat all callers' diffs as completed,
// not just the winner's. Bailed callers would otherwise drop their IDs
// and the runner could see their diffs as still in progress (their
// `complete` job hook hasn't fired yet — see computeScreenshotDiff).
const COMPLETED_IDS_TTL_MS = 60_000;
function getCompletedIdsKey(buildId: string) {
  return `conclude-build-completed-ids:${buildId}`;
}

/**
 * Concludes the build by updating the conclusion and the stats.
 * Called when all diffs are processed.
 */
export async function concludeBuild(input: {
  build: Build;
  /**
   * Create a build notification.
   * @default true
   */
  notify?: boolean;
  /**
   * If provided, we consider these screenshot diffs as completed.
   */
  completedScreenshotDiffIds?: string[];
}) {
  const { build, completedScreenshotDiffIds, notify = true } = input;
  const buildId = build.id;
  const completedIdsKey = getCompletedIdsKey(buildId);
  return Sentry.startSpan(
    {
      name: "concludeBuild",
      attributes: {
        "argos.build.id": buildId,
        "argos.notify": notify,
        "argos.completed_screenshot_diff_count":
          completedScreenshotDiffIds?.length ?? 0,
      },
    },
    async () => {
      // Pool this caller's completed diff IDs in Redis *before* entering
      // coalesce. If we lose the claim and return null, our IDs are still
      // available to the winning runner — otherwise the runner would only
      // know about its own diff and could see ours as still in progress
      // (the job framework hasn't fired our `complete` hook yet).
      if (completedScreenshotDiffIds && completedScreenshotDiffIds.length) {
        const redis = await getRedisClient();
        // Pool IDs and refresh TTL atomically so a crash between the two
        // commands can never leave a set without an expiration (which
        // would leak in Redis forever).
        await redis
          .multi()
          .sAdd(completedIdsKey, completedScreenshotDiffIds)
          .pExpire(completedIdsKey, COMPLETED_IDS_TTL_MS)
          .exec();
      }

      // Coalesce a burst of completions (e.g. 100 screenshot diffs
      // finishing in parallel) into a single execution. The first caller
      // claims the window, waits briefly so concurrent callers can register
      // their `complete` job handlers, then runs the conclude logic once.
      // Other callers in the window bail immediately — they would only
      // have been no-ops anyway. The rerun flag captures any caller that
      // arrives during execution so its work isn't dropped.
      return redisLock.coalesce(
        ["conclude-build", buildId],
        async () => {
          const existingBuild = await Build.query()
            .findById(buildId)
            .throwIfNotFound();

          if (existingBuild.conclusion !== null) {
            // If the build is already concluded, we don't want to update it.
            return;
          }
          // Read the pooled IDs (winner + every bailer that contributed
          // before us). Each rerun iteration re-reads so later bailers
          // are included too.
          const redis = await getRedisClient();
          const pooledIds = await redis.sMembers(completedIdsKey);
          const [status] = await Build.getScreenshotDiffsStatuses([buildId], {
            completedScreenshotDiffIds: pooledIds,
          });
          invariant(status !== undefined, "status should exist for build");

          const [conclusion, [stats]] = await Promise.all([
            status === "complete"
              ? Build.computeConclusion(existingBuild)
              : null,
            Build.computeStats([buildId]),
          ]);
          invariant(stats !== undefined, "stats should exist for build");
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

            const compareScreenshotBucket = await updatedBuild.$relatedQuery(
              "compareScreenshotBucket",
            );
            invariant(
              compareScreenshotBucket,
              `Compare screenshot bucket not found for build: ${updatedBuild.id}`,
            );

            await Promise.all([
              buildNotificationJob.push(buildNotification.id),
              triggerAndRunAutomation({
                projectId: build.projectId,
                message: {
                  event: AutomationEvents.BuildCompleted,
                  payload: { build: updatedBuild, compareScreenshotBucket },
                },
              }),
            ]);

            // Auto-approve on behalf of users whose previous approvals already
            // cover all of this build's changes. Runs after the notification
            // above so its `diff-accepted` notification supersedes the
            // `diff-detected` one in the coalesced build-notification job.
            // Never let auto-approval failures break build conclusion.
            if (conclusion === "changes-detected") {
              await autoApproveBuild({ build: updatedBuild }).catch((err) => {
                Sentry.captureException(err);
              });
            }
          } else {
            await Build.query()
              .findById(buildId)
              .patch(getBuildData({ conclusion, stats }));
          }
        },
        { delay: 30 },
      );
    },
  );
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
