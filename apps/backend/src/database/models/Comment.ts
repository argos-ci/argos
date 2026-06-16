import type { JSONSchema, RelationMappings } from "objection";
import { z } from "zod";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { BuildReview } from "./BuildReview";
import { CommentMention } from "./CommentMention";
import { CommentReaction } from "./CommentReaction";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { User } from "./User";

const COORDINATE_MESSAGE = "Comment anchor coordinates must be between 0 and 1";
const LINES_MESSAGE = "Comment anchor lines must be positive integers";

/**
 * A point on the referenced screenshot diff, stored as normalized coordinates
 * (0–1 of the image's width/height) so it survives scaling. The baseline and
 * compare sides render at the same scale, so a single coordinate applies to
 * both.
 */
const CommentPointAnchorSchema = z.object({
  type: z.literal("point"),
  x: z.number().min(0, { message: COORDINATE_MESSAGE }).max(1, {
    message: COORDINATE_MESSAGE,
  }),
  y: z.number().min(0, { message: COORDINATE_MESSAGE }).max(1, {
    message: COORDINATE_MESSAGE,
  }),
});

/** A 1-based inclusive line range on a textual snapshot. */
const CommentLinesAnchorSchema = z.object({
  type: z.literal("lines"),
  from: z.number().int().min(1, { message: LINES_MESSAGE }),
  to: z.number().int().min(1, { message: LINES_MESSAGE }),
});

const CommentAnchorObjectSchema = z.discriminatedUnion("type", [
  CommentPointAnchorSchema,
  CommentLinesAnchorSchema,
]);

/**
 * Where on the referenced screenshot diff a comment points. A null anchor (with
 * a `screenshotDiffId` set) means the comment is about the whole diff. All
 * anchor validation lives here so the model, the API and the inferred type stay
 * in sync.
 */
export const CommentAnchorSchema = CommentAnchorObjectSchema.refine(
  (anchor) => anchor.type !== "lines" || anchor.to >= anchor.from,
  { message: "Comment anchor line range is inverted" },
);

export type CommentAnchor = z.infer<typeof CommentAnchorSchema>;

const commentAnchorJsonSchema = z.toJSONSchema(
  CommentAnchorObjectSchema.nullable(),
  { io: "input" },
) as JSONSchema;

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
          anchor: commentAnchorJsonSchema,
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
