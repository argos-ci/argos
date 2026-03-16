import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { BuildReview } from "./BuildReview";
import { CommentReaction } from "./CommentReaction";
import { User } from "./User";

export class Comment extends Model {
  static override tableName = "comments";

  static override get jsonAttributes() {
    return ["content"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "buildId", "content"],
        properties: {
          userId: { type: "string" },
          buildId: { type: "string" },
          buildReviewId: { type: ["string", "null"] },
          threadId: { type: ["string", "null"] },
          content: {
            anyOf: [
              { type: "array" },
              { type: "boolean" },
              { type: "null" },
              { type: "number" },
              { type: "object" },
              { type: "string" },
            ],
          },
        },
      },
    ],
  };

  userId!: string;
  buildId!: string;
  buildReviewId!: string | null;
  threadId!: string | null;
  content!: unknown;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "comments.userId",
          to: "users.id",
        },
      },
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "comments.buildId",
          to: "builds.id",
        },
      },
      buildReview: {
        relation: Model.BelongsToOneRelation,
        modelClass: BuildReview,
        join: {
          from: "comments.buildReviewId",
          to: "build_reviews.id",
        },
      },
      thread: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: "comments.threadId",
          to: "comments.id",
        },
      },
      replies: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: "comments.id",
          to: "comments.threadId",
        },
      },
      reactions: {
        relation: Model.HasManyRelation,
        modelClass: CommentReaction,
        join: {
          from: "comments.id",
          to: "comment_reactions.commentId",
        },
      },
    };
  }

  user?: User;
  build?: Build;
  buildReview?: BuildReview | null;
  thread?: Comment | null;
  replies?: Comment[];
  reactions?: CommentReaction[];
}
