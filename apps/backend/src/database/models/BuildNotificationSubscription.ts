import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { User } from "./User";

export class BuildNotificationSubscription extends Model {
  static override tableName = "build_notification_subscriptions";

  static override get idColumn() {
    return ["buildId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId", "userId"],
        properties: {
          buildId: { type: "string" },
          userId: { type: "string" },
          subscribedAt: { type: ["string", "null"] },
          unsubscribedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  buildId!: string;
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
   * Whether the user has intentionally unsubscribed.
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

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_notification_subscriptions.buildId",
          to: "builds.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "build_notification_subscriptions.userId",
          to: "users.id",
        },
      },
    };
  }

  build?: Build;
  user?: User;
}
