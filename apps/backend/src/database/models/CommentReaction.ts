import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Comment } from "./Comment";
import { User } from "./User";

export class CommentReaction extends Model {
  static override tableName = "comment_reactions";

  static override get idColumn() {
    return ["commentId", "userId", "emoji"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["commentId", "userId", "emoji"],
        properties: {
          commentId: { type: "string" },
          userId: { type: "string" },
          emoji: { type: "string" },
        },
      },
    ],
  };

  commentId!: string;
  userId!: string;
  emoji!: string;

  static override get relationMappings(): RelationMappings {
    return {
      comment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: "comment_reactions.commentId",
          to: "comments.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "comment_reactions.userId",
          to: "users.id",
        },
      },
    };
  }

  comment?: Comment;
  user?: User;
}
