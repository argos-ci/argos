import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  JobStatus,
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { Build } from "./Build.js";

export class Crawl extends Model {
  static override tableName = "crawls";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["buildId", "baseUrl"],
    properties: {
      buildId: { type: "string" },
      baseUrl: { type: "string" },
    },
  });

  jobStatus!: JobStatus;
  buildId!: string;
  baseUrl!: string;

  static override get relationMappings(): RelationMappings {
    return {
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

  build?: Build;
}
