import { assertNever } from "@argos/util/assertNever";

import { Build } from "@/database/models/Build";
import { BuildNotification } from "@/database/models/BuildNotification";
import type { Project } from "@/database/models/Project";

import {
  getNotificationStates,
  type NotificationPayload,
} from "./notification";

export async function getAggregatedNotification(args: {
  projectId: string;
  commit: string;
  buildType: Build["type"];
  summaryCheckConfig: Project["summaryCheck"];
}): Promise<NotificationPayload | null> {
  const { commit, projectId, buildType, summaryCheckConfig } = args;

  if (summaryCheckConfig === "never") {
    return null;
  }

  const siblingBuilds = await Build.query()
    .select("builds.id")
    .joinRelated("compareScreenshotBucket")
    .where("builds.projectId", projectId)
    .where("compareScreenshotBucket.commit", commit)
    .distinctOn("builds.name")
    .orderBy("builds.name")
    .orderBy("builds.createdAt", "desc");

  // If there is only one sibling build, then we don't need to aggregate notifications
  if (siblingBuilds.length <= 1 && summaryCheckConfig === "auto") {
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

  const states = getNotificationStates({
    buildNotificationType: type,
    buildType,
  });
  const base = {
    context: "argos/summary",
    github: {
      state: states.github,
    },
    gitlab: {
      state: states.gitlab,
    },
  };

  const isAutoApproved = buildType === "reference";

  switch (type) {
    case "queued":
      return {
        ...base,
        description: "Builds queued...",
      };
    case "progress":
      return {
        ...base,
        description: "Builds in progress...",
      };
    case "diff-detected":
      return {
        ...base,
        description: isAutoApproved ? "Auto-approved" : "Diff detected",
      };
    case "diff-accepted":
      return { ...base, description: "Diff accepted" };
    case "diff-rejected":
      return { ...base, description: "Diff rejected" };
    case "no-diff-detected":
      return {
        ...base,
        description: isAutoApproved ? "Auto-approved" : "No diff detected",
      };
    default:
      assertNever(type);
  }
}
