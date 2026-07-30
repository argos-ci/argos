import type { JSONSchema } from "objection";
import { z } from "zod";

import { Model } from "./model";

/**
 * The `subscribedAt` / `unsubscribedAt` columns every notification subscription
 * table carries, as a JSON-schema fragment to compose into a model's own schema.
 */
export const notificationSubscriptionSchema = z.toJSONSchema(
  z.object({
    subscribedAt: z.string().nullish(),
    unsubscribedAt: z.string().nullish(),
  }),
  { io: "input" },
) as JSONSchema;

/**
 * What every notification subscription has in common: a user, and the two dates
 * that say where they stand.
 *
 * Both dates are kept rather than a single boolean so an intentional
 * unsubscription can be told apart from "never subscribed" — the distinction the
 * auto-subscribe relies on to avoid re-subscribing someone who opted out.
 *
 * Subclasses add the column naming what is subscribed to (`buildId`, `testId`,
 * `commentId`) and pair it with `userId` as the primary key.
 */
export abstract class NotificationSubscription extends Model {
  userId!: string;
  subscribedAt!: string | null;
  unsubscribedAt!: string | null;

  /**
   * Whether the user is currently subscribed.
   */
  isSubscribed(): boolean {
    if (!this.subscribedAt) {
      return false;
    }
    if (!this.unsubscribedAt) {
      return true;
    }
    return this.subscribedAt > this.unsubscribedAt;
  }

  /**
   * Whether the user has intentionally unsubscribed. A tie counts as
   * unsubscribed: the two dates only collide when both were written in the same
   * millisecond, and refusing to re-subscribe is the safer reading.
   */
  isIntentionallyUnsubscribed(): boolean {
    if (!this.unsubscribedAt) {
      return false;
    }
    if (!this.subscribedAt) {
      return true;
    }
    return this.unsubscribedAt >= this.subscribedAt;
  }
}
