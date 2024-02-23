import type { BuildNotification } from "@/database/models/BuildNotification.js";
import { UnretryableError } from "@/job-core/error.js";
import { getStatsMessage } from "./utils.js";
import { assertUnreachable } from "@/util/unreachable.js";

enum GithubNotificationState {
  Pending = "pending",
  Success = "success",
  Error = "error",
  Failure = "failure",
}

enum GitlabNotificationState {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failed = "failed",
  Canceled = "canceled",
}

enum VercelStatus {
  Completed = "completed",
  Running = "running",
}

enum VercelConclusion {
  Neutral = "neutral",
  Succeeded = "succeeded",
  Canceled = "canceled",
  Failed = "failed",
  Skipped = "skipped",
}

/**
 * Get the notification status for each platform based on the build
 * notification type and if it's a reference build.
 */
export function getNotificationStatus(
  buildNotificationType: BuildNotification["type"],
  isReference: boolean,
): {
  githubState: GithubNotificationState;
  gitlabState: GitlabNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
} {
  switch (buildNotificationType) {
    case "queued": {
      return {
        githubState: GithubNotificationState.Pending,
        gitlabState: GitlabNotificationState.Pending,
        vercelStatus: VercelStatus.Running,
        vercelConclusion: null,
      };
    }
    case "progress": {
      return {
        githubState: GithubNotificationState.Pending,
        gitlabState: GitlabNotificationState.Running,
        vercelStatus: VercelStatus.Running,
        vercelConclusion: null,
      };
    }
    case "no-diff-detected": {
      return {
        githubState: GithubNotificationState.Success,
        gitlabState: GitlabNotificationState.Success,
        vercelStatus: VercelStatus.Completed,
        vercelConclusion: VercelConclusion.Succeeded,
      };
    }
    case "diff-detected": {
      return {
        githubState: isReference
          ? GithubNotificationState.Success
          : GithubNotificationState.Failure,
        gitlabState: isReference
          ? GitlabNotificationState.Success
          : GitlabNotificationState.Failed,
        vercelStatus: VercelStatus.Completed,
        vercelConclusion: isReference
          ? VercelConclusion.Succeeded
          : VercelConclusion.Failed,
      };
    }
    case "diff-accepted": {
      return {
        githubState: GithubNotificationState.Success,
        gitlabState: GitlabNotificationState.Success,
        vercelStatus: null,
        vercelConclusion: null,
      };
    }
    case "diff-rejected": {
      return {
        githubState: GithubNotificationState.Failure,
        gitlabState: GitlabNotificationState.Failed,
        vercelStatus: null,
        vercelConclusion: null,
      };
    }
    default: {
      throw new UnretryableError(
        `Unknown notification type: ${buildNotificationType}`,
      );
    }
  }
}

/**
 * Get the notification description for each platform based on the build
 * notification type and if it's a reference build.
 */
async function getNotificationDescription(
  buildNotification: BuildNotification,
  isReference: boolean,
): Promise<string> {
  switch (buildNotification.type) {
    case "queued":
      return "Build is queued";
    case "progress":
      return "Build in progress...";
    case "no-diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      if (!statsMessage) {
        if (isReference) {
          return "Used as comparison baseline";
        }
        return "Everything's good!";
      }
      if (isReference) {
        return `${statsMessage} — used as comparison baseline`;
      }
      return `${statsMessage} — no change`;
    }
    case "diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      if (isReference) {
        return `${statsMessage} — used as comparison baseline`;
      }
      return `${statsMessage} — waiting for your decision`;
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return `${statsMessage} — approved`;
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return `${statsMessage} — rejected`;
    }
    default: {
      assertUnreachable(buildNotification.type);
    }
  }
}

export type NotificationPayload = {
  description: string;
  githubState: GithubNotificationState;
  gitlabState: GitlabNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
};

/**
 * Get the notification payload for each platform based on the build.
 */
export async function getNotificationPayload(
  buildNotification: BuildNotification,
  isReference: boolean,
): Promise<NotificationPayload> {
  const status = getNotificationStatus(buildNotification.type, isReference);
  const description = await getNotificationDescription(
    buildNotification,
    isReference,
  );
  return {
    ...status,
    description,
  };
}
