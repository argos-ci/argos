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
    repeat?: number;
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
  required: ["sdk", "automationLibrary"],
  additionalProperties: false,
  properties: {
    url: {
      type: "string",
    },
    viewport: {
      type: "object",
      required: ["width", "height"],
      additionalProperties: false,
      properties: {
        width: {
          type: "integer",
          minimum: 0,
        },
        height: {
          type: "integer",
          minimum: 0,
        },
      },
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
          required: ["title", "titlePath"],
          additionalProperties: false,
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
            retries: {
              type: "integer",
              minimum: 0,
            },
            retry: {
              type: "integer",
              minimum: 0,
            },
            repeat: {
              type: "integer",
              minimum: 0,
            },
            location: {
              type: "object",
              required: ["file", "line", "column"],
              additionalProperties: false,
              properties: {
                file: {
                  type: "string",
                },
                line: {
                  type: "integer",
                  minimum: 0,
                },
                column: {
                  type: "integer",
                  minimum: 0,
                },
              },
            },
          },
        },
        { type: "null" },
      ],
    },
    browser: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
    },
    automationLibrary: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
    },
    sdk: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
    },
  },
};

export class Screenshot extends Model {
  static override tableName = "screenshots";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "s3Id", "screenshotBucketId"],
    properties: {
      name: { type: "string", maxLength: 1024 },
      baseName: { type: ["string", "null"], maxLength: 1024 },
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
  baseName!: string | null;
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
