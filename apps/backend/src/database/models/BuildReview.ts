import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { User } from "./User.js";

export class BuildReview extends Model {
  static override tableName = "build_reviews";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["buildId", "state"],
    properties: {
      buildId: { type: "string" },
      userId: { type: ["string", "null"] },
      state: { type: "string", enum: ["pending", "approved", "rejected"] },
    },
  });

  buildId!: string;
  userId!: string | null;
  state!: "pending" | "approved" | "rejected";

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
    };
  }

  build?: Build;
  user?: User;
}
