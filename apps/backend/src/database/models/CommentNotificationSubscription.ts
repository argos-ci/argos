import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Comment } from "./Comment";
import { User } from "./User";

export class CommentNotificationSubscription extends Model {
  static override tableName = "comment_notifications_subscriptions";

  static override get idColumn() {
    return ["commentId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["commentId", "userId"],
        properties: {
          commentId: { type: "string" },
          userId: { type: "string" },
          subscribedAt: { type: ["string", "null"] },
          unsubscribedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  declare commentId: string;
  declare userId: string;
  declare subscribedAt: string | null;
  declare unsubscribedAt: string | null;

  isSubscribed(): boolean {
    if (!this.subscribedAt) {
      return false;
    }
    if (!this.unsubscribedAt) {
      return true;
    }
    return this.subscribedAt > this.unsubscribedAt;
  }

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

  declare comment?: Comment;
  declare user?: User;
}
