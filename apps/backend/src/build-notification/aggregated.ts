import { Build } from "@/database/models/Build.js";
import { BuildNotification } from "@/database/models/BuildNotification.js";
import {
  type NotificationPayload,
  getNotificationStatus,
} from "./notification.js";
import { assertUnreachable } from "@/util/unreachable.js";

export async function getAggregatedNotification(
  commit: string,
  isReference: boolean,
): Promise<NotificationPayload | null> {
  const siblingBuilds = await Build.query()
    .join(
      "screenshot_buckets as sb",
      "builds.compareScreenshotBucketId",
      "sb.id",
    )
    .where("sb.commit", commit)
    .distinctOn("builds.name")
    .orderBy("builds.name")
    .orderBy("builds.createdAt", "desc");

  // If there is only one sibling build, then we don't need to aggregate notifications
  if (siblingBuilds.length <= 1) {
    return null;
  }

  const lastBuildNotifications = await BuildNotification.query()
    .whereIn(
      "buildId",
      siblingBuilds.map((build) => build.id),
    )
    .distinctOn("buildId")
    .orderBy("buildId")
    .orderBy("createdAt", "desc");

  type Stats = Record<BuildNotification["type"], number>;
  const stats = lastBuildNotifications.reduce(
    (stats, notification) => {
      stats[notification.type] += 1;
      return stats;
    },
    {
      queued: 0,
      progress: 0,
      "no-diff-detected": 0,
      "diff-detected": 0,
      "diff-accepted": 0,
      "diff-rejected": 0,
    } satisfies Stats,
  );

  const type: BuildNotification["type"] =
    stats.queued > 0
      ? "queued"
      : stats.progress > 0
        ? "progress"
        : stats["diff-detected"] > 0
          ? "diff-detected"
          : stats["diff-rejected"] > 0
            ? "diff-rejected"
            : stats["diff-accepted"] > 0
              ? "diff-accepted"
              : "no-diff-detected";

  const notificationStatus = getNotificationStatus(type, isReference);

  switch (type) {
    case "queued":
      return { description: "Builds queued...", ...notificationStatus };
    case "progress":
      return { description: "Builds in progress...", ...notificationStatus };
    case "diff-detected":
      return {
        description: isReference ? "Used as new baseline" : "Diff detected",
        ...notificationStatus,
      };
    case "diff-accepted":
      return { description: "Diff accepted", ...notificationStatus };
    case "diff-rejected":
      return { description: "Diff rejected", ...notificationStatus };
    case "no-diff-detected":
      return {
        description: isReference ? "Used as new baseline" : "No diff detected",
        ...notificationStatus,
      };
    default:
      assertUnreachable(type);
  }
}
