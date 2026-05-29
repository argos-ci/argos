import config from "@/config";

import { notificationHandlers } from "./handlers";
import type { NotificationCategory } from "./workflow-types";

/**
 * Channels a user can configure preferences for. Only email is supported today.
 */
export const NOTIFICATION_CHANNELS = ["email"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

type CategoryMetadata = {
  label: string;
  description: string;
};

/**
 * Human-readable metadata for each notification category, surfaced in the
 * notification settings UI.
 */
export const notificationCategoryMetadata: Record<
  NotificationCategory,
  CategoryMetadata
> = {
  account: {
    label: "Account",
    description: "Essential notifications about your account.",
  },
  security: {
    label: "Security",
    description:
      "Security notifications, like email changes and expiring certificates.",
  },
  review: {
    label: "Reviews",
    description: "When someone reviews or dismisses a review on your builds.",
  },
  billing: {
    label: "Billing",
    description: "Spend limit alerts for teams you own.",
  },
  project: {
    label: "Projects",
    description: "Updates about your projects, such as deletions.",
  },
  integration: {
    label: "Integrations",
    description: "Issues with your connected integrations that need attention.",
  },
};

/**
 * Stable display order for categories.
 */
const CATEGORY_ORDER: NotificationCategory[] = [
  "account",
  "security",
  "review",
  "billing",
  "project",
  "integration",
];

/**
 * URL to a user's notification preferences page.
 */
export function getNotificationSettingsUrl(accountSlug: string): string {
  return new URL(
    `/${accountSlug}/settings/notifications`,
    config.get("server.url"),
  ).href;
}

/**
 * Categories the user can opt out of, derived from the handlers. A category is
 * configurable as soon as one of its handlers is configurable.
 */
export function getConfigurableNotificationCategories(): NotificationCategory[] {
  const configurable = new Set<NotificationCategory>();
  for (const handler of notificationHandlers) {
    if (handler.configurable) {
      configurable.add(handler.category);
    }
  }
  return CATEGORY_ORDER.filter((category) => configurable.has(category));
}
