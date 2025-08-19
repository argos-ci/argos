import type { Build, BuildNotification } from "@/database/models";

import type { NotificationPayload } from "./notification";

/**
 * Context for sending notifications to integrated services.
 */
export type SendNotificationContext = {
  buildNotification: BuildNotification;
  commit: string;
  build: Build;
  buildUrl: string;
  projectUrl: string;
  notification: NotificationPayload;
  aggregatedNotification: NotificationPayload | null;
};
