import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { BuildReview } from "./BuildReview";
import { CommentMention } from "./CommentMention";
import { CommentReaction } from "./CommentReaction";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { User } from "./User";

/** Which side of a diff a position anchor points at. */
export type CommentAnchorSide = "baseline" | "compare";

/**
 * A point on one side of the referenced screenshot diff, stored as normalized
 * coordinates (0–1 of the image's width/height) so it survives scaling.
 */
type CommentPointAnchor = {
  type: "point";
  side: CommentAnchorSide;
  x: number;
  y: number;
};

/** A 1-based inclusive line range on a textual snapshot. */
type CommentLinesAnchor = {
  type: "lines";
  from: number;
  to: number;
};

/**
 * Where on the referenced screenshot diff a comment points. A null anchor (with
 * a `screenshotDiffId` set) means the comment is about the whole diff.
 */
export type CommentAnchor = CommentPointAnchor | CommentLinesAnchor;

export class Comment extends Model {
  static override tableName = "comments";

  static override get jsonAttributes() {
    return ["content", "anchor"];
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
          screenshotDiffId: { type: ["string", "null"] },
          anchor: { type: ["object", "null"] },
          editedAt: { type: ["string", "null"] },
          deletedAt: { type: ["string", "null"] },
          resolvedAt: { type: ["string", "null"] },
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
  /** The screenshot diff this comment is anchored to, if any. */
  screenshotDiffId!: string | null;
  /** Where on {@link screenshotDiffId} the comment points; null = whole diff. */
  anchor!: CommentAnchor | null;
  editedAt!: string | null;
  deletedAt!: string | null;
  /**
   * When set, the thread is resolved. Only ever set on a root comment (one with
   * a null `threadId`); replies leave it null and inherit their thread's state.
   */
  resolvedAt!: string | null;
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
      mentions: {
        relation: Model.HasManyRelation,
        modelClass: CommentMention,
        join: {
          from: "comments.id",
          to: "comment_mentions.commentId",
        },
      },
      screenshotDiff: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "comments.screenshotDiffId",
          to: "screenshot_diffs.id",
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
  mentions?: CommentMention[];
  screenshotDiff?: ScreenshotDiff | null;
}
