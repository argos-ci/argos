import { assertNever } from "@argos/util/assertNever";

import { Build } from "@/database/models/Build";
import { BuildNotification } from "@/database/models/BuildNotification";
import type { Project } from "@/database/models/Project";
import { ScreenshotBucket } from "@/database/models/ScreenshotBucket";

import {
  getNotificationStates,
  type NotificationPayload,
} from "./notification";

/**
 * Every build of the project on this commit, re-runs included — merge queue
 * builds too, which is why the bucket arm does not exclude builds that have a
 * `prHeadCommit`. Unioned rather than joined: an `or` across both tables is
 * indexable on neither, so Postgres hashed all of `screenshot_buckets` for it.
 */
function queryCommitBuildIds(input: { project: Project; commit: string }) {
  const { project, commit } = input;
  const projectBuilds = () =>
    Build.query().select("builds.id").where("builds.projectId", project.id);

  return projectBuilds()
    .where("builds.prHeadCommit", commit)
    .unionAll(
      projectBuilds().whereIn(
        "builds.compareScreenshotBucketId",
        ScreenshotBucket.query()
          .select("id")
          .where("projectId", project.id)
          .where("commit", commit),
      ),
    );
}

export async function getAggregatedNotificationPayload(args: {
  project: Project;
  commit: string;
  buildType: Build["type"];
  summaryCheckConfig: Project["summaryCheck"];
}): Promise<NotificationPayload | null> {
  const { commit, project, buildType, summaryCheckConfig } = args;

  if (summaryCheckConfig === "never") {
    return null;
  }

  const [siblingBuilds, projectUrl] = await Promise.all([
    Build.query()
      .select("builds.id")
      .whereIn("builds.id", queryCommitBuildIds({ project, commit }))
      .distinctOn("builds.name")
      .orderBy("builds.name")
      .orderBy("builds.createdAt", "desc"),
    project.getUrl(),
  ]);

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
    origin: states.origin,
    url: projectUrl,
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
