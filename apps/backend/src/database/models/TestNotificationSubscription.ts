import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Test } from "./Test";
import { User } from "./User";

export class TestNotificationSubscription extends Model {
  static override tableName = "test_notification_subscriptions";

  static override get idColumn() {
    return ["testId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["testId", "userId"],
        properties: {
          testId: { type: "string" },
          userId: { type: "string" },
          subscribedAt: { type: ["string", "null"] },
          unsubscribedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  testId!: string;
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
      test: {
        relation: Model.BelongsToOneRelation,
        modelClass: Test,
        join: {
          from: "test_notification_subscriptions.testId",
          to: "tests.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "test_notification_subscriptions.userId",
          to: "users.id",
        },
      },
    };
  }

  test?: Test;
  user?: User;
}
