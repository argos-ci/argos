import jwt from "jsonwebtoken";

import config from "@/config";

import {
  getConfigurableNotificationCategories,
  type NotificationChannel,
} from "./categories";
import type { NotificationCategory } from "./workflow-types";

const TOKEN_TYPE = "notification_unsubscribe";

export type UnsubscribePayload = {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
};

/**
 * Sign a stateless unsubscribe token. It is intentionally long-lived and
 * idempotent so the link keeps working for the life of the email and can be
 * used by both the one-click POST and the footer link.
 */
export function signUnsubscribeToken(payload: UnsubscribePayload): string {
  return jwt.sign(
    { type: TOKEN_TYPE, ...payload },
    config.get("session.secret"),
    { algorithm: "HS256" },
  );
}

/**
 * Verify an unsubscribe token, returning its payload or null if invalid.
 */
export function verifyUnsubscribeToken(
  token: string,
): UnsubscribePayload | null {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, config.get("session.secret"));
  } catch {
    return null;
  }
  if (typeof decoded !== "object" || decoded === null) {
    return null;
  }
  const payload = decoded as Record<string, unknown>;
  const { type, userId, category, channel } = payload;
  if (
    type !== TOKEN_TYPE ||
    typeof userId !== "string" ||
    typeof category !== "string" ||
    typeof channel !== "string"
  ) {
    return null;
  }
  // Only configurable categories can be unsubscribed from.
  if (
    !getConfigurableNotificationCategories().includes(
      category as NotificationCategory,
    )
  ) {
    return null;
  }
  return {
    userId,
    category: category as NotificationCategory,
    channel: channel as NotificationChannel,
  };
}

/**
 * Build the public unsubscribe URL for a given category and channel.
 */
export function getUnsubscribeUrl(payload: UnsubscribePayload): string {
  const url = new URL("/notifications/unsubscribe", config.get("server.url"));
  url.searchParams.set("token", signUnsubscribeToken(payload));
  return url.href;
}
