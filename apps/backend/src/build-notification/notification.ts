import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { getStatsMessage } from "@/build/stats";
import { Project } from "@/database/models";
import { Build } from "@/database/models/Build";
import type { BuildNotification } from "@/database/models/BuildNotification";
import { UnretryableError } from "@/job-core/error";

export const NotificationPayloadSchema = z.object({
  description: z.string(),
  context: z.string(),
  github: z.object({
    state: z.enum(["pending", "success", "error", "failure"]),
  }),
  gitlab: z.object({
    state: z.enum(["pending", "running", "success", "failed", "canceled"]),
  }),
});
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/**
 * Check if the project has a sibling project with the same repository.
 */
async function checkHasSiblingProject(project: Project): Promise<boolean> {
  if (!project.githubRepositoryId && !project.gitlabProjectId) {
    return false;
  }

  const query = Project.query();

  if (project.githubRepositoryId) {
    query.orWhere("githubRepositoryId", project.githubRepositoryId);
  }

  if (project.gitlabProjectId) {
    query.orWhere("gitlabProjectId", project.gitlabProjectId);
  }

  const projectCount = await query.resultSize();
  return projectCount > 1;
}

/**
 * Get the status context for the build.
 */
async function getStatusContext(build: Build): Promise<string> {
  let context = "argos";

  await build.$fetchGraph("project", { skipFetched: true });
  invariant(build.project, "Project not found", UnretryableError);

  const hasSiblingProject = await checkHasSiblingProject(build.project);

  if (hasSiblingProject) {
    context = `${context}/${build.project.name}`;
  }

  if (build.name === "default") {
    return context;
  }

  return `${context}/${build.name}`;
}

/**
 * Get the notification status for each platform based on the build
 * notification type and if it's an auto-approved build.
 */
export function getNotificationStates(args: {
  buildNotificationType: BuildNotification["type"];
  buildType: Build["type"];
}): {
  github: NotificationPayload["github"]["state"];
  gitlab: NotificationPayload["gitlab"]["state"];
} {
  const { buildNotificationType, buildType } = args;
  if (buildType === "skipped") {
    return {
      github: "success",
      gitlab: "success",
    };
  }
  const isAutoApproved = buildType === "reference";
  switch (buildNotificationType) {
    case "queued": {
      return {
        github: "pending",
        gitlab: "pending",
      };
    }
    case "progress": {
      return {
        github: "pending",
        gitlab: "running",
      };
    }
    case "no-diff-detected": {
      return {
        github: "success",
        gitlab: "success",
      };
    }
    case "diff-detected": {
      return {
        github: isAutoApproved ? "success" : "failure",
        gitlab: isAutoApproved ? "success" : "failed",
      };
    }
    case "diff-accepted": {
      return {
        github: "success",
        gitlab: "success",
      };
    }
    case "diff-rejected": {
      return {
        github: "failure",
        gitlab: "failed",
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
export async function getNotificationPayload(input: {
  buildNotification: Pick<BuildNotification, "type">;
  build: Build;
}): Promise<NotificationPayload> {
  const description = getNotificationDescription({
    buildNotificationType: input.buildNotification.type,
    build: input.build,
  });
  const states = getNotificationStates({
    buildNotificationType: input.buildNotification.type,
    buildType: input.build.type,
  });
  const context = await getStatusContext(input.build);

  return {
    description,
    context,
    github: {
      state: states.github,
    },
    gitlab: {
      state: states.gitlab,
    },
  };
}
