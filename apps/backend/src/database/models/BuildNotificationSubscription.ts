import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import {
  NotificationSubscription,
  notificationSubscriptionSchema,
} from "../util/notification-subscription";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { User } from "./User";

export class BuildNotificationSubscription extends NotificationSubscription {
  static override tableName = "build_notification_subscriptions";

  static override get idColumn() {
    return ["buildId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      notificationSubscriptionSchema,
      {
        type: "object",
        required: ["buildId", "userId"],
        properties: {
          buildId: { type: "string" },
          userId: { type: "string" },
        },
      },
    ],
  };

  buildId!: string;

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
