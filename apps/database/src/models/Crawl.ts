import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { ScreenshotBucket } from "./ScreenshotBucket.js";
import { Build } from "./Build.js";

export class Crawl extends Model {
  static override tableName = "crawls";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["buildId", "screenshotBucketId", "baseUrl"],
    properties: {
      buildId: { type: "string" },
      screenshotBucketId: { type: "string" },
      baseUrl: { type: "string" },
    },
  });

  buildId!: string;
  screenshotBucketId!: string;
  baseUrl!: string;

  static override get relationMappings(): RelationMappings {
    return {
      screenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: "crawls.screenshotBucketId",
          to: "screenshot_buckets.id",
        },
      },
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "crawls.buildId",
          to: "builds.id",
        },
      },
    };
  }

  screenshotBucket?: ScreenshotBucket;
  build?: Build;
}
