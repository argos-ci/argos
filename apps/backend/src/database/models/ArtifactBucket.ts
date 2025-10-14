import type { RelationMappings } from "objection";

import { SHA1_REGEX } from "@/util/validation";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Artifact } from "./Artifact";
import type { BuildMode } from "./Build";
import { Project } from "./Project";

export class ArtifactBucket extends Model {
  static override tableName = "artifact_buckets";

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
          artifactCount: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          storybookScreenshotCount: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          snapshotCount: {
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
   * The number of artifacts in the bucket (all types).
   */
  artifactCount!: number;

  /**
   * The number of Storybook screenshots in the bucket.
   */
  storybookScreenshotCount!: number;

  /**
   * The number of snapshots (non-screenshot) in the bucket.
   */
  snapshotCount!: number;

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
      artifacts: {
        relation: Model.HasManyRelation,
        modelClass: Artifact,
        join: {
          from: "artifact_buckets.id",
          to: "artifacts.artifactBucketId",
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

  artifacts?: Artifact[];
  project?: Project;
}
