import { Model, mergeSchemas, timestampsSchema } from "../util";
import { File } from "./File";
import { ScreenshotBucket } from "./ScreenshotBucket";

export class Screenshot extends Model {
  static get tableName() {
    return "screenshots";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["name", "s3Id", "screenshotBucketId"],
      properties: {
        name: { type: "string" },
        s3Id: { type: "string" },
        screenshotBucketId: { type: "string" },
        fileId: { type: "string" },
      },
    });
  }

  static get relationMappings() {
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
}
