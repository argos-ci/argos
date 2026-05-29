import config from "@/config";

import type { NotificationCategory } from "./workflow-types";

/**
 * Channels a user can configure preferences for. Only email is supported today.
 */
export const NOTIFICATION_CHANNELS = ["email"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

type CategoryMetadata = {
  label: string;
  description: string;
  /**
   * Whether users can opt out of this category. Transactional and security
   * notifications are not configurable and are always delivered.
   */
  configurable: boolean;
};

/**
 * Metadata for each notification category, surfaced in the notification
 * settings UI and used to decide whether a category can be opted out of.
 */
export const notificationCategoryMetadata: Record<
  NotificationCategory,
  CategoryMetadata
> = {
  account: {
    label: "Account",
    description: "Essential notifications about your account.",
    configurable: false,
  },
  security: {
    label: "Security",
    description:
      "Security notifications, like email changes and expiring certificates.",
    configurable: false,
  },
  review: {
    label: "Reviews",
    description: "When someone reviews or dismisses a review on your builds.",
    configurable: true,
  },
  billing: {
    label: "Billing",
    description: "Spend limit alerts for teams you own.",
    configurable: true,
  },
  project: {
    label: "Projects",
    description: "Updates about your projects, such as deletions.",
    configurable: true,
  },
  integration: {
    label: "Integrations",
    description: "Issues with your connected integrations that need attention.",
    configurable: true,
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
 * Whether a category can be opted out of by the user.
 */
export function isConfigurableNotificationCategory(
  category: NotificationCategory,
): boolean {
  return notificationCategoryMetadata[category].configurable;
}

/**
 * Categories the user can opt out of, in display order.
 */
export function getConfigurableNotificationCategories(): NotificationCategory[] {
  return CATEGORY_ORDER.filter(isConfigurableNotificationCategory);
}
