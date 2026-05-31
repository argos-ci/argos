import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { Comment } from "./Comment";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { Test } from "./Test";
import { User } from "./User";

/**
 * The kind of entity a mention points at. Only "user" is produced today; the
 * others are part of the table shape so they can be wired up without a
 * migration.
 */
export type CommentMentionType = "user" | "build" | "test" | "screenshotDiff";

export class CommentMention extends Model {
  static override tableName = "comment_mentions";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["commentId", "type"],
        properties: {
          commentId: { type: "string" },
          type: {
            type: "string",
            enum: ["user", "build", "test", "screenshotDiff"],
          },
          mentionedUserId: { type: ["string", "null"] },
          mentionedBuildId: { type: ["string", "null"] },
          mentionedTestId: { type: ["string", "null"] },
          mentionedScreenshotDiffId: { type: ["string", "null"] },
        },
      },
    ],
  };

  commentId!: string;
  type!: CommentMentionType;
  mentionedUserId!: string | null;
  mentionedBuildId!: string | null;
  mentionedTestId!: string | null;
  mentionedScreenshotDiffId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      comment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Comment,
        join: {
          from: "comment_mentions.commentId",
          to: "comments.id",
        },
      },
      mentionedUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "comment_mentions.mentionedUserId",
          to: "users.id",
        },
      },
      mentionedBuild: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "comment_mentions.mentionedBuildId",
          to: "builds.id",
        },
      },
      mentionedTest: {
        relation: Model.BelongsToOneRelation,
        modelClass: Test,
        join: {
          from: "comment_mentions.mentionedTestId",
          to: "tests.id",
        },
      },
      mentionedScreenshotDiff: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "comment_mentions.mentionedScreenshotDiffId",
          to: "screenshot_diffs.id",
        },
      },
    };
  }

  comment?: Comment;
  mentionedUser?: User | null;
  mentionedBuild?: Build | null;
  mentionedTest?: Test | null;
  mentionedScreenshotDiff?: ScreenshotDiff | null;
}
