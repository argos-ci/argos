import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import {
  NotificationSubscription,
  notificationSubscriptionSchema,
} from "../util/notification-subscription";
import { timestampsSchema } from "../util/schemas";
import { Comment } from "./Comment";
import { User } from "./User";

export class CommentNotificationSubscription extends NotificationSubscription {
  static override tableName = "comment_notifications_subscriptions";

  static override get idColumn() {
    return ["commentId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      notificationSubscriptionSchema,
      {
        type: "object",
        required: ["commentId", "userId"],
        properties: {
          commentId: { type: "string" },
          userId: { type: "string" },
        },
      },
    ],
  };

  commentId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      comment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: "comment_notifications_subscriptions.commentId",
          to: "comments.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "comment_notifications_subscriptions.userId",
          to: "users.id",
        },
      },
    };
  }

  comment?: Comment;
  user?: User;
}
