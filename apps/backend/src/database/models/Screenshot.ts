import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { BuildShard } from "./BuildShard.js";
import { File } from "./File.js";
import { ScreenshotBucket } from "./ScreenshotBucket.js";
import { Test } from "./Test.js";

export type ScreenshotMetadata = {
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  colorScheme?: "light" | "dark";
  mediaType?: "screen" | "print";
  test?: {
    id?: string;
    title: string;
    titlePath: string[];
    location?: {
      file: string;
      line: number;
      column: number;
    };
    retry?: number;
    retries?: number;
  } | null;
  browser?: {
    name: string;
    version: string;
  };
  automationLibrary: {
    name: string;
    version: string;
  };
  sdk: {
    name: string;
    version: string;
  };
};

export const ScreenshotMetadataJsonSchema = {
  type: ["object", "null"],
  properties: {
    url: {
      type: "string",
    },
    viewport: {
      type: "object",
      properties: {
        width: {
          type: "number",
        },
        height: {
          type: "number",
        },
      },
      required: ["width", "height"],
    },
    colorScheme: {
      type: "string",
      enum: ["light", "dark"],
    },
    mediaType: {
      type: "string",
      enum: ["screen", "print"],
    },
    test: {
      oneOf: [
        {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            title: {
              type: "string",
            },
            titlePath: {
              type: "array",
              items: {
                type: "string",
              },
            },
            location: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                },
                line: {
                  type: "number",
                },
                column: {
                  type: "number",
                },
              },
              required: ["file", "line", "column"],
            },
          },
          required: ["title", "titlePath"],
        },
        {
          type: "null",
        },
      ],
    },
    browser: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
    automationLibrary: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
    sdk: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
      required: ["name", "version"],
    },
  },
  required: ["sdk", "automationLibrary"],
  additionalProperties: false,
};

export class Screenshot extends Model {
  static override tableName = "screenshots";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "s3Id", "screenshotBucketId"],
    properties: {
      name: { type: "string", maxLength: 1024 },
      s3Id: { type: "string" },
      screenshotBucketId: { type: "string" },
      fileId: { type: ["string", "null"] },
      testId: { type: ["string", "null"] },
      metadata: ScreenshotMetadataJsonSchema,
      playwrightTraceFileId: { type: ["string", "null"] },
      buildShardId: { type: ["string", "null"] },
      threshold: { type: ["number", "null"], minimum: 0, maximum: 1 },
    },
  });

  name!: string;
  s3Id!: string;
  screenshotBucketId!: string;
  fileId!: string | null;
  testId!: string | null;
  metadata!: ScreenshotMetadata | null;
  playwrightTraceFileId!: string | null;
  buildShardId!: string | null;
  threshold!: number | null;

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
