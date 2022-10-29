import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Repository } from "./Repository.js";
import { Screenshot } from "./Screenshot.js";

const SHA1_REGEXP = "^[0-9a-f]{40}$";

export class ScreenshotBucket extends Model {
  static override tableName = "screenshot_buckets";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "commit", "branch"],
    properties: {
      name: { type: "string" },
      complete: { type: "boolean" },
      commit: {
        type: "string",
        pattern: SHA1_REGEXP,
      },
      branch: { type: "string" },
      repositoryId: { type: "string" },
    },
  });

  name!: string;
  complete!: boolean;
  commit!: string;
  branch!: string;
  repositoryId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "screenshot_buckets.id",
          to: "screenshots.screenshotBucketId",
        },
      },
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: "screenshot_buckets.repositoryId",
          to: "repositories.id",
        },
      },
    };
  }

  screenshots?: Screenshot[];
  repository?: Repository;
}
