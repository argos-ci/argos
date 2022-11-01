import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { File } from "./File.js";
import { ScreenshotBucket } from "./ScreenshotBucket.js";

export class Screenshot extends Model {
  static override tableName = "screenshots";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "s3Id", "screenshotBucketId"],
    properties: {
      name: { type: "string" },
      s3Id: { type: "string" },
      screenshotBucketId: { type: "string" },
      fileId: { type: "string" },
    },
  });

  name!: string;
  s3Id!: string;
  screenshotBucketId!: string;
  fileId!: string;

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
    };
  }

  screenshotBucket?: ScreenshotBucket;
  file?: File;
}
