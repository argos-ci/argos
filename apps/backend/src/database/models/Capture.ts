import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { Crawl } from "./Crawl.js";
import { File } from "./File.js";
import { Screenshot } from "./Screenshot.js";

export class Capture extends Model {
  static override tableName = "captures";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["crawlId", "url"],
    properties: {
      crawlId: { type: "string" },
      url: { type: "string" },
      screenshotId: { type: ["string", "null"] },
      fileId: { type: ["string", "null"] },
    },
  });

  jobStatus!: JobStatus;
  crawlId!: string;
  url!: string;
  screenshotId!: string | null;
  fileId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      crawl: {
        relation: Model.BelongsToOneRelation,
        modelClass: Crawl,
        join: {
          from: "captures.crawlId",
          to: "crawls.id",
        },
      },
      screenshot: {
        relation: Model.HasOneRelation,
        modelClass: Screenshot,
        join: {
          from: "captures.screenshotId",
          to: "screenshots.id",
        },
      },
      file: {
        relation: Model.HasOneRelation,
        modelClass: File,
        join: {
          from: "captures.fileId",
          to: "files.id",
        },
      },
    };
  }

  crawl?: Crawl;
  screenshot?: Screenshot | null;
  file?: File | null;
}
