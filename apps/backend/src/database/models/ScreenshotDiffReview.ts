import { Model, type RelationMappings } from "objection";

import { BuildReview } from "./BuildReview";
import { ScreenshotDiff } from "./ScreenshotDiff";

export class ScreenshotDiffReview extends Model {
  static override tableName = "screenshot_diff_reviews";

  static override get idColumn() {
    return ["buildReviewId", "screenshotDiffId"];
  }

  static override jsonSchema = {
    type: "object",
    required: ["screenshotDiffId", "buildReviewId", "state"],
    properties: {
      screenshotDiffId: { type: "string" },
      buildReviewId: { type: "string" },
      state: { type: "string", enum: ["approved", "rejected"] },
    },
  };

  screenshotDiffId!: string;
  buildReviewId!: string;
  state!: "approved" | "rejected";

  static override get relationMappings(): RelationMappings {
    return {
      buildReview: {
        relation: Model.BelongsToOneRelation,
        modelClass: BuildReview,
        join: {
          from: "screenshot_diff_reviews.buildReviewId",
          to: "build_reviews.id",
        },
      },
      screenshotDiff: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "screenshot_diff_reviews.screenshotDiffId",
          to: "screenshot_diffs.id",
        },
      },
    };
  }

  buildReview?: BuildReview;
  screenshotDiff?: ScreenshotDiff;
}
