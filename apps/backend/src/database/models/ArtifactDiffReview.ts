import { Model, type RelationMappings } from "objection";

import { ArtifactDiff } from "./ArtifactDiff";
import { BuildReview } from "./BuildReview";

export class ArtifactDiffReview extends Model {
  static override tableName = "artifact_diff_reviews";

  static override get idColumn() {
    return ["buildReviewId", "artifactDiffId"];
  }

  static override jsonSchema = {
    type: "object",
    required: ["artifactDiffId", "buildReviewId", "state"],
    properties: {
      artifactDiffId: { type: "string" },
      buildReviewId: { type: "string" },
      state: { type: "string", enum: ["approved", "rejected"] },
    },
  };

  artifactDiffId!: string;
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
      artifactDiff: {
        relation: Model.BelongsToOneRelation,
        modelClass: ArtifactDiff,
        join: {
          from: "artifact_diff_reviews.artifactDiffId",
          to: "artifact_diffs.id",
        },
      },
    };
  }

  buildReview?: BuildReview;
  artifactDiff?: ArtifactDiff;
}
