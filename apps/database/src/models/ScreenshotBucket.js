import { Model, mergeSchemas, timestampsSchema } from "../util";
import { Screenshot } from "./Screenshot";
import { Repository } from "./Repository";

const SHA1_REGEXP = "^[a-zA-Z0-9]{40}$";

export class ScreenshotBucket extends Model {
  static get tableName() {
    return "screenshot_buckets";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
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
  }

  /** @type {string} */
  name;

  /** @type {boolean} */
  complete;

  /** @type {string} */
  commit;

  /** @type {string} */
  branch;

  /** @type {string} */
  repositoryId;

  static get relationMappings() {
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
}
