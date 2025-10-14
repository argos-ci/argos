import type { JSONSchema, RelationMappings } from "objection";

import {
  ScreenshotMetadata,
  ScreenshotMetadataJSONSchema,
} from "../schemas/ScreenshotMetadata";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { ArtifactBucket } from "./ArtifactBucket";
import { BuildShard } from "./BuildShard";
import { File } from "./File";
import { Test } from "./Test";

export class Artifact extends Model {
  static override tableName = "artifacts";

  static override get jsonAttributes() {
    return ["metadata"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "s3Id", "artifactBucketId"],
        properties: {
          name: { type: "string", maxLength: 1024 },
          baseName: { type: ["string", "null"], maxLength: 1024 },
          s3Id: { type: "string" },
          artifactBucketId: { type: "string" },
          fileId: { type: ["string", "null"] },
          testId: { type: ["string", "null"] },
          metadata: {
            anyOf: [
              ScreenshotMetadataJSONSchema as JSONSchema,
              { type: "null" },
            ],
          },
          playwrightTraceFileId: { type: ["string", "null"] },
          buildShardId: { type: ["string", "null"] },
          threshold: { type: ["number", "null"], minimum: 0, maximum: 1 },
        },
      },
    ],
  };

  name!: string;
  baseName!: string | null;
  s3Id!: string;
  artifactBucketId!: string;
  fileId!: string | null;
  testId!: string | null;
  metadata!: ScreenshotMetadata | null;
  playwrightTraceFileId!: string | null;
  buildShardId!: string | null;
  threshold!: number | null;

  static override get relationMappings(): RelationMappings {
    return {
      artifactBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ArtifactBucket,
        join: {
          from: "artifacts.artifactBucketId",
          to: "artifact_buckets.id",
        },
      },
      file: {
        relation: Model.HasOneRelation,
        modelClass: File,
        join: {
          from: "screenshots.fileId",
          to: "files.id",
        },
      },
      test: {
        relation: Model.BelongsToOneRelation,
        modelClass: Test,
        join: {
          from: "screenshots.testId",
          to: "tests.id",
        },
      },
      playwrightTraceFile: {
        relation: Model.HasOneRelation,
        modelClass: File,
        join: {
          from: "screenshots.playwrightTraceFileId",
          to: "files.id",
        },
      },
      buildShard: {
        relation: Model.BelongsToOneRelation,
        modelClass: BuildShard,
        join: {
          from: "screenshots.buildShardId",
          to: "build_shards.id",
        },
      },
    };
  }

  artifactBucket?: ArtifactBucket;
  file?: File;
  test?: Test | null;
  playwrightTraceFile?: File | null;
}
