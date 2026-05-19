import type {
  Build,
  BuildNotification,
  Project,
  ScreenshotBucket,
} from "@/database/models";

/**
 * Context for sending notifications to integrated services.
 */
export type SendNotificationContext = {
  buildNotification: BuildNotification;
  commit: string;
  build: Build;
  project: Project;
  compareScreenshotBucket: ScreenshotBucket;
};
