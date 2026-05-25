import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { Comment } from "./Comment";
import { ScreenshotDiffReview } from "./ScreenshotDiffReview";
import { User } from "./User";

export class BuildReview extends Model {
  static override tableName = "build_reviews";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId", "state"],
        properties: {
          buildId: { type: "string" },
          userId: { type: ["string", "null"] },
          dismissedAt: { type: ["string", "null"] },
          dismissedById: { type: ["string", "null"] },
          state: {
            type: "string",
            enum: ["approved", "rejected", "commented", "pending"],
          },
        },
      },
    ],
  };

  buildId!: string;
  userId!: string | null;
  dismissedAt!: string | null;
  dismissedById!: string | null;
  state!: "approved" | "rejected" | "commented" | "pending";

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_reviews.buildId",
          to: "builds.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "build_reviews.userId",
          to: "users.id",
        },
      },
      dismissedBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "build_reviews.dismissedById",
          to: "users.id",
        },
      },
      screenshotDiffReviews: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiffReview,
        join: {
          from: "build_reviews.id",
          to: "screenshot_diff_reviews.buildReviewId",
        },
      },
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: "build_reviews.id",
          to: "comments.buildReviewId",
        },
      },
    };
  }

  build?: Build;
  user?: User;
  dismissedBy?: User | null;
  screenshotDiffReviews?: ScreenshotDiffReview[];
  comments?: Comment[];
}
