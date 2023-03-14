import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Repository } from "./Repository.js";
import { Screenshot } from "./Screenshot.js";
import type { ScreenshotDiff } from "./ScreenshotDiff.js";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "repositoryId", "buildName"],
    properties: {
      name: { type: "string" },
      repositoryId: { type: "string" },
      buildName: { type: "string" },
      status: {
        type: ["string"],
        enum: ["pending", "resolved", "muted"],
      },
      resolvedDate: { type: ["string", "null"] },
      resolvedStabilityScore: { type: ["number", "null"] },
      muteUntil: { type: ["string", "null"] },
    },
  });

  name!: string;
  repositoryId!: string;
  buildName!: string;
  status!: string;
  resolvedDate!: string | null;
  resolvedStabilityScore!: number | null;
  muteUntil!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: "screenshot_buckets.repositoryId",
          to: "repositories.id",
        },
      },
      screenshotDiffs: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "screenshot_buckets.id",
          to: "screenshots.screenshotBucketId",
        },
      },
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "screenshot_buckets.id",
          to: "screenshots.screenshotBucketId",
        },
      },
    };
  }

  repository?: Repository;
  screenshotDiffs?: ScreenshotDiff[];
  screenshots?: Screenshot[];
}
