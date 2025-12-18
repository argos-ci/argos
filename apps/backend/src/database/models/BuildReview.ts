import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
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
          state: { type: "string", enum: ["approved", "rejected"] },
        },
      },
    ],
  };

  buildId!: string;
  userId!: string | null;
  state!: "approved" | "rejected";

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
      screenshotDiffReviews: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiffReview,
        join: {
          from: "build_reviews.id",
          to: "screenshot_diff_reviews.buildReviewId",
        },
      },
    };
  }

  build?: Build;
  user?: User;
  screenshotDiffReviews?: ScreenshotDiffReview[];
}
