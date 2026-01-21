import {
  ScreenshotMetadata,
  ScreenshotMetadataJSONSchema,
} from "@argos/schemas/screenshot-metadata";
import type { JSONSchema, RelationMappings } from "objection";
import type Objection from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { BuildShard } from "./BuildShard";
import { File } from "./File";
import { ScreenshotBucket } from "./ScreenshotBucket";
import { Test } from "./Test";

export class Screenshot extends Model {
  static override tableName = "screenshots";

  static override get jsonAttributes() {
    return ["metadata"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "s3Id", "screenshotBucketId"],
        properties: {
          name: { type: "string", maxLength: 1024 },
          baseName: { type: ["string", "null"], maxLength: 1024 },
          s3Id: { type: "string" },
          screenshotBucketId: { type: "string" },
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
  parentName!: string | null;
  s3Id!: string;
  screenshotBucketId!: string;
  fileId!: string | null;
  testId!: string | null;
  metadata!: ScreenshotMetadata | null;
  playwrightTraceFileId!: string | null;
  buildShardId!: string | null;
  threshold!: number | null;

  /**
   * Create a partial clone of a screenshot model.
   *
   * Extracts only the essential properties needed to copy screenshots between buckets,
   * excluding system fields (id, timestamps), relationships, and bucket/shard references.
   * This method serves as a type-safe guard: any new properties added to the model
   * will require explicit consideration here.
   */
  static partialClone(
    model: Screenshot,
  ): Omit<
    Objection.ModelObject<Screenshot>,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "screenshotBucketId"
    | "buildShardId"
    | "screenshotBucket"
    | "file"
    | "test"
    | "playwrightTraceFile"
  > {
    return {
      name: model.name,
      s3Id: model.s3Id,
      fileId: model.fileId,
      testId: model.testId,
      metadata: model.metadata,
      playwrightTraceFileId: model.playwrightTraceFileId,
      threshold: model.threshold,
      baseName: model.baseName,
      parentName: model.parentName,
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      screenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: "screenshots.screenshotBucketId",
          to: "screenshot_buckets.id",
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

  screenshotBucket?: ScreenshotBucket;
  file?: File;
  test?: Test | null;
  playwrightTraceFile?: File | null;
}
