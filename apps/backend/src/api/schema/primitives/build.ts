import { invariant } from "@argos/util/invariant";

import {
  getNotificationPayload,
  NotificationPayloadSchema,
} from "@/build-notification/index.js";
import {
  Build,
  BuildAggregatedStatus,
  BuildAggregatedStatusSchema,
  BuildNotification,
} from "@/database/models/index.js";

import { z } from "../util/zod.js";

export const BuildSchema = z
  .object({
    id: z.string().openapi({
      description: "A unique identifier for the build",
      example: "12345",
      ref: "BuildId",
    }),
    number: z.number().min(1).openapi({
      description: "The build number",
    }),
    status: BuildAggregatedStatusSchema.openapi({
      description: "The status of the build",
    }),
    url: z.string().url().openapi({
      description: "The URL of the build",
    }),
    notification: NotificationPayloadSchema.nullable().openapi({
      description: "The notification payload for the build",
    }),
  })
  .openapi({
    description: "Build",
    ref: "Build",
  });

function getBuildNotificationTypeFromBuildStatus(
  buildStatus: BuildAggregatedStatus,
): BuildNotification["type"] | null {
  switch (buildStatus) {
    case "accepted":
      return "diff-accepted";
    case "rejected":
      return "diff-rejected";
    case "diffDetected":
      return "diff-detected";
    case "pending":
      return "queued";
    case "progress":
      return "progress";
    case "stable":
      return "no-diff-detected";
    default:
      return null;
  }
}

/**
 * Serialize builds for API response.
 */
export async function serializeBuilds(
  builds: Build[],
): Promise<z.infer<typeof BuildSchema>[]> {
  const [statuses, urls] = await Promise.all([
    Build.getAggregatedBuildStatuses(builds),
    Promise.all(builds.map((build) => build.getUrl())),
  ]);

  const notificationPayloads = await Promise.all(
    builds.map((build, i) => {
      const status = statuses[i];
      invariant(status, "Status should be fetched for all builds");
      const buildNotificationType =
        getBuildNotificationTypeFromBuildStatus(status);
      if (!buildNotificationType) {
        return null;
      }
      return getNotificationPayload({
        buildNotification: { type: buildNotificationType },
        build,
      });
    }),
  );

  return builds.map((build, i) => {
    const status = statuses[i];
    invariant(status, "Status should be fetched for all builds");
    const url = urls[i];
    invariant(url, "URL should be fetched for all builds");
    const notificationPayload = notificationPayloads[i];
    invariant(
      notificationPayload !== undefined,
      "Notification payload should be fetched for all builds",
    );
    return {
      id: build.id,
      number: build.number,
      status,
      url,
      notification: notificationPayload,
    };
  });
}
