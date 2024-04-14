import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import { Build } from "@/database/models/Build.js";
import type { BuildNotification } from "@/database/models/BuildNotification.js";
import { UnretryableError } from "@/job-core/error.js";

import { getStatsMessage } from "./utils.js";

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

function getStatusContext(buildName: string): string {
  return buildName === "default" ? "argos" : `argos/${buildName}`;
}

/**
 * Get the notification status for each platform based on the build
 * notification type and if it's a reference build.
 */
export function getNotificationStates(input: {
  buildNotificationType: BuildNotification["type"];
  isReference: boolean;
}): {
  github: NotificationPayload["github"]["state"];
  gitlab: NotificationPayload["gitlab"]["state"];
} {
  const { buildNotificationType, isReference } = input;
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
        github: isReference ? "success" : "failure",
        gitlab: isReference ? "success" : "failed",
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

/**
 * Get the notification description for each platform based on the build
 * notification type and if it's a reference build.
 */
async function getNotificationDescription(input: {
  buildNotificationType: BuildNotification["type"];
  buildId: string;
  isReference: boolean;
}): Promise<string> {
  const { buildNotificationType, buildId, isReference } = input;
  switch (buildNotificationType) {
    case "queued":
      return "Build is queued";
    case "progress":
      return "Build in progress...";
    case "no-diff-detected": {
      const statsMessage = await getStatsMessage(buildId);
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
      const statsMessage = await getStatsMessage(buildId);
      if (isReference) {
        return `${statsMessage} — used as comparison baseline`;
      }
      return `${statsMessage} — waiting for your decision`;
    }
    case "diff-accepted": {
      const statsMessage = await getStatsMessage(buildId);
      return `${statsMessage} — approved`;
    }
    case "diff-rejected": {
      const statsMessage = await getStatsMessage(buildId);
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
  build: Pick<Build, "id" | "name" | "type">;
}): Promise<NotificationPayload> {
  const context = getStatusContext(input.build.name);
  const states = getNotificationStates({
    buildNotificationType: input.buildNotification.type,
    isReference: input.build.type === "reference",
  });
  const description = await getNotificationDescription({
    buildNotificationType: input.buildNotification.type,
    buildId: input.build.id,
    isReference: input.build.type === "reference",
  });
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
