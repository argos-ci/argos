import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import type { BuildMode } from "./Build.js";
import { Project } from "./Project.js";
import { Screenshot } from "./Screenshot.js";

const SHA1_REGEXP = "^[0-9a-f]{40}$";

export class ScreenshotBucket extends Model {
  static override tableName = "screenshot_buckets";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "commit", "branch", "valid"],
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
      mode: { type: "string", enum: ["ci", "monitoring"] },
      valid: { type: "boolean" },
    },
  });

  /**
   * The name of the screenshot bucket, identic to the build name.
   */
  name!: string;
  /**
   * True if screenshots from all shards have been uploaded.
   */
  complete!: boolean;
  /**
   * The commit hash of the build.
   */
  commit!: string;
  /**
   * The branch of the build.
   */
  branch!: string;
  /**
   * The project ID of the build.
   */
  projectId!: string;
  /**
   * The number of screenshots in the bucket.
   */
  screenshotCount!: number;
  /**
   * The mode of the build.
   */
  mode!: BuildMode;
  /**
   * True if the bucket is valid.
   * A bucket is considered valid if it's created from a "passed" test suite.
   */
  valid!: boolean;

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
