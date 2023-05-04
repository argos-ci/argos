import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project.js";
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
      projectId: { type: "string" },
      screenshotCount: { type: "integer" },
    },
  });

  name!: string;
  complete!: boolean;
  commit!: string;
  branch!: string;
  projectId!: string;
  screenshotCount!: number;

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
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "screenshot_buckets.projectId",
          to: "projects.id",
        },
      },
    };
  }

  screenshots?: Screenshot[];
  project?: Project;
}
