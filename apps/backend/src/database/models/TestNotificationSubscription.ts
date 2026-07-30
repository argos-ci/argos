import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import {
  NotificationSubscription,
  notificationSubscriptionSchema,
} from "../util/notification-subscription";
import { timestampsSchema } from "../util/schemas";
import { Test } from "./Test";
import { User } from "./User";

export class TestNotificationSubscription extends NotificationSubscription {
  static override tableName = "test_notification_subscriptions";

  static override get idColumn() {
    return ["testId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      notificationSubscriptionSchema,
      {
        type: "object",
        required: ["testId", "userId"],
        properties: {
          testId: { type: "string" },
          userId: { type: "string" },
        },
      },
    ],
  };

  testId!: string;

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
