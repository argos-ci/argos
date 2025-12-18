import type { RelationMappings } from "objection";

import { SHA1_REGEX } from "@/util/validation";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import type { BuildMode } from "./Build";
import { Project } from "./Project";
import { Screenshot } from "./Screenshot";

export class ScreenshotBucket extends Model {
  static override tableName = "screenshot_buckets";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "commit", "branch", "complete", "valid"],
        properties: {
          name: { type: "string" },
          commit: { type: "string", pattern: SHA1_REGEX.source },
          branch: { type: "string" },
          projectId: { type: "string" },
          screenshotCount: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          storybookScreenshotCount: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          mode: { type: "string", enum: ["ci", "monitoring"] },
          complete: { type: "boolean" },
          valid: { type: "boolean" },
        },
      },
    ],
  };

  /**
   * The name of the screenshot bucket, identic to the build name.
   */
  name!: string;

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
   * The number of screenshots in the bucket (including Storybook screenshots).
   */
  screenshotCount!: number;

  /**
   * The number of Storybook screenshots in the bucket.
   */
  storybookScreenshotCount!: number;

  /**
   * The mode of the build.
   */
  mode!: BuildMode;

  /**
   * True if screenshots from all shards have been uploaded.
   */
  complete!: boolean;

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
