import type { BuildNotification } from "@/database/models/BuildNotification.js";
import { UnretryableError } from "@/job-core/error.js";
import { getStatsMessage } from "./utils.js";

export enum GithubNotificationState {
  Pending = "pending",
  Success = "success",
  Error = "error",
  Failure = "failure",
}

export enum GitlabNotificationState {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failed = "failed",
  Canceled = "canceled",
}

export enum VercelStatus {
  Completed = "completed",
  Running = "running",
}

export enum VercelConclusion {
  Neutral = "neutral",
  Succeeded = "succeeded",
  Canceled = "canceled",
  Failed = "failed",
  Skipped = "skipped",
}

export const getNotificationStatus = (
  buildNotificationType: BuildNotification["type"],
  isReference: boolean,
): {
  githubState: GithubNotificationState;
  gitlabState: GitlabNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
} => {
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
};

export type NotificationPayload = {
  description: string;
  githubState: GithubNotificationState;
  gitlabState: GitlabNotificationState;
  vercelStatus: VercelStatus | null;
  vercelConclusion: VercelConclusion | null;
};

export const getNotificationPayload = async (
  buildNotification: BuildNotification,
  isReference: boolean,
): Promise<NotificationPayload> => {
  switch (buildNotification.type) {
    case "queued":
      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description: "Build is queued",
      };
    case "progress":
      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description: "Build in progress...",
      };
    case "no-diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      const description = (() => {
        if (!statsMessage) {
          if (isReference) return "Used as new baseline";
          return "Everything's good!";
        }
        if (isReference) return `${statsMessage} — used a new baseline`;
        return `${statsMessage} — no change`;
      })();
      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description,
      };
    }
    case "diff-detected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      const description = (() => {
        if (isReference) {
          return `${statsMessage} — used as new baseline`;
        }
        return `${statsMessage} — waiting for your decision`;
      })();

      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description,
      };
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description: `${statsMessage} — changes approved`,
      };
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildNotification.buildId);
      return {
        ...getNotificationStatus(buildNotification.type, isReference),
        description: `${statsMessage} — changes rejected`,
      };
    }
    default:
      throw new Error(`Unknown notification type: ${buildNotification.type}`);
  }
};
