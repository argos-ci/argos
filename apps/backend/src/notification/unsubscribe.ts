import jwt from "jsonwebtoken";
import { z } from "zod";

import config from "@/config";

import {
  getConfigurableNotificationCategories,
  NOTIFICATION_CHANNELS,
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
 * Schema for the decoded JWT payload. The category is constrained to the
 * configurable categories so a token can never disable a mandatory one.
 */
const UnsubscribeTokenSchema = z.object({
  type: z.literal(TOKEN_TYPE),
  userId: z.string(),
  category: z.enum(
    getConfigurableNotificationCategories() as [
      NotificationCategory,
      ...NotificationCategory[],
    ],
  ),
  channel: z.enum(NOTIFICATION_CHANNELS),
});

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
  const result = UnsubscribeTokenSchema.safeParse(decoded);
  if (!result.success) {
    return null;
  }
  const { userId, category, channel } = result.data;
  return { userId, category, channel };
}

/**
 * Build the public unsubscribe URL for a given category and channel.
 */
export function getUnsubscribeUrl(payload: UnsubscribePayload): string {
  const url = new URL(
    "/account/notifications/unsubscribe",
    config.get("server.url"),
  );
  url.searchParams.set("token", signUnsubscribeToken(payload));
  return url.href;
}
