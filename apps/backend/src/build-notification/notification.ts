import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { getStatsMessage } from "@/build/stats";
import { Project, type AwaitingReviewStatus } from "@/database/models";
import { Build } from "@/database/models/Build";
import type { BuildNotification } from "@/database/models/BuildNotification";
import { UnretryableError } from "@/job-core/error";

/**
 * The notification type describing a build in its current state, what a
 * consumer catching up on a build should be told.
 */
export function getBuildNotificationTypeFromBuildStatus(
  buildStatus: BuildAggregatedStatus,
): BuildNotification["type"] | null {
  switch (buildStatus) {
    case "accepted":
      return "diff-accepted";
    case "rejected":
      return "diff-rejected";
    case "changes-detected":
      return "diff-detected";
    case "pending":
      return "queued";
    case "progress":
      return "progress";
    case "no-changes":
      return "no-diff-detected";
    default:
      return null;
  }
}

export const NotificationPayloadSchema = z.object({
  description: z.string(),
  context: z.string(),
  github: z.object({
    state: z.enum(["pending", "success", "error", "failure"]),
  }),
  gitlab: z.object({
    state: z.enum(["pending", "running", "success", "failed", "canceled"]),
  }),
  origin: z.object({
    status: z.enum(["queued", "in_progress", "completed"]),
    conclusion: z.enum(["success", "failure"]).nullable(),
  }),
  url: z.url(),
});
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/**
 * Check if the project has a sibling project with the same repository.
 */
async function checkHasSiblingProject(project: Project): Promise<boolean> {
  if (
    !project.githubRepositoryId &&
    !project.gitlabProjectId &&
    !project.originRepositoryId
  ) {
    return false;
  }

  // The repository predicates are grouped: left loose alongside the
  // soft-delete filter they would `or` their way past it.
  const query = Project.queryNotDeleted().where((qb) => {
    if (project.githubRepositoryId) {
      qb.orWhere("githubRepositoryId", project.githubRepositoryId);
    }

    if (project.gitlabProjectId) {
      qb.orWhere("gitlabProjectId", project.gitlabProjectId);
    }

    if (project.originRepositoryId) {
      qb.orWhere("originRepositoryId", project.originRepositoryId);
    }
  });

  const projectCount = await query.resultSize();
  return projectCount > 1;
}

/**
 * Get the status context for the build.
 */
async function getStatusContext(input: {
  build: Build;
  project: Project;
}): Promise<string> {
  const { build, project } = input;
  let context = "argos";

  const hasSiblingProject = await checkHasSiblingProject(project);

  if (hasSiblingProject) {
    context = `${context}/${project.name}`;
  }

  if (build.name === "default") {
    return context;
  }

  return `${context}/${build.name}`;
}

type NotificationStates = {
  github: NotificationPayload["github"]["state"];
  gitlab: NotificationPayload["gitlab"]["state"];
  origin: NotificationPayload["origin"];
};

function getAwaitingReviewStates(
  awaitingReviewStatus: AwaitingReviewStatus,
): NotificationStates {
  switch (awaitingReviewStatus) {
    case "failure":
      return {
        github: "failure",
        gitlab: "failed",
        origin: { status: "completed", conclusion: "failure" },
      };
    case "pending":
      return {
        github: "pending",
        gitlab: "running",
        origin: { status: "in_progress", conclusion: null },
      };
    default:
      assertNever(awaitingReviewStatus);
  }
}

/**
 * Get the notification status for each platform based on the build
 * notification type, if it's an auto-approved build, and the status the
 * project reports while changes wait for a review.
 */
export function getNotificationStates(args: {
  buildNotificationType: BuildNotification["type"];
  buildType: Build["type"];
  awaitingReviewStatus: AwaitingReviewStatus;
}): NotificationStates {
  const { buildNotificationType, buildType, awaitingReviewStatus } = args;
  if (buildType === "skipped") {
    return {
      github: "success",
      gitlab: "success",
      origin: { status: "completed", conclusion: "success" },
    };
  }
  const isAutoApproved = buildType === "reference";
  switch (buildNotificationType) {
    case "queued": {
      return {
        github: "pending",
        gitlab: "pending",
        origin: { status: "queued", conclusion: null },
      };
    }
    case "progress": {
      return {
        github: "pending",
        // A GitLab status is never updated in place, and `running` only moves
        // on to a conclusion. When the review wait is reported `running`, the
        // build in progress stays `pending`, or the wait — far longer — would
        // keep the "in progress" description.
        gitlab: awaitingReviewStatus === "pending" ? "pending" : "running",
        origin: { status: "in_progress", conclusion: null },
      };
    }
    case "no-diff-detected": {
      return {
        github: "success",
        gitlab: "success",
        origin: { status: "completed", conclusion: "success" },
      };
    }
    case "diff-detected": {
      if (isAutoApproved) {
        return {
          github: "success",
          gitlab: "success",
          origin: { status: "completed", conclusion: "success" },
        };
      }
      return getAwaitingReviewStates(awaitingReviewStatus);
    }
    case "diff-accepted": {
      return {
        github: "success",
        gitlab: "success",
        origin: { status: "completed", conclusion: "success" },
      };
    }
    case "diff-rejected": {
      return {
        github: "failure",
        gitlab: "failed",
        origin: { status: "completed", conclusion: "failure" },
      };
    }
    default: {
      assertNever(
        buildNotificationType,
        "unknown notification type",
        UnretryableError,
      );
    }
  }
}

function getBuildStatsMessage(build: Build): string {
  invariant(build.stats, "Build should be concluded");
  return getStatsMessage(build.stats, { isSubsetBuild: build.subset });
}

/**
 * Get the notification description for each platform based on the build
 * notification type and if it's a auto-approved build.
 */
function getNotificationDescription(input: {
  buildNotificationType: BuildNotification["type"];
  build: Build;
}): string {
  const { buildNotificationType, build } = input;
  if (build.type === "skipped") {
    return "Build skipped";
  }
  const isAutoApproved = build.type === "reference";
  switch (buildNotificationType) {
    case "queued":
      return "Build is queued";
    case "progress":
      return "Build in progress...";
    case "no-diff-detected": {
      const statsMessage = getBuildStatsMessage(build);
      if (!statsMessage) {
        if (isAutoApproved) {
          return "Auto-approved, no changes found";
        }
        return "Everything's good!";
      }
      if (isAutoApproved) {
        return `Auto-approved, no changes found — ${statsMessage}`;
      }
      return `${statsMessage} — no changes found`;
    }
    case "diff-detected": {
      const statsMessage = getBuildStatsMessage(build);
      if (isAutoApproved) {
        return `${statsMessage}, automatically approved`;
      }
      return `${statsMessage} — waiting for your decision`;
    }
    case "diff-accepted": {
      const statsMessage = getBuildStatsMessage(build);
      return `${statsMessage} — approved`;
    }
    case "diff-rejected": {
      const statsMessage = getBuildStatsMessage(build);
      return `${statsMessage} — rejected`;
    }
    default: {
      assertNever(buildNotificationType);
    }
  }
}

/**
 * Get the notification payload for each platform based on the build.
 */
export async function getNotificationPayload(args: {
  buildNotification: Pick<BuildNotification, "type">;
  build: Build;
}): Promise<NotificationPayload> {
  const { buildNotification, build } = args;
  await build.$fetchGraph("project", { skipFetched: true });
  const { project } = build;
  invariant(project, "Project not found", UnretryableError);
  const description = getNotificationDescription({
    buildNotificationType: buildNotification.type,
    build: build,
  });
  const states = getNotificationStates({
    buildNotificationType: buildNotification.type,
    buildType: build.type,
    awaitingReviewStatus: project.awaitingReviewStatus,
  });
  const [context, buildUrl] = await Promise.all([
    getStatusContext({ build, project }),
    build.getUrl(),
  ]);

  return {
    description,
    context,
    github: {
      state: states.github,
    },
    gitlab: {
      state: states.gitlab,
    },
    origin: states.origin,
    url: buildUrl,
  };
}
