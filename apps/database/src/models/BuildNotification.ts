import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import type { JobStatus } from "../util/schemas.js";
import { Build } from "./Build.js";

export class BuildNotification extends Model {
  static override tableName = "build_notifications";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["type", "buildId"],
    properties: {
      type: {
        type: "string",
        enum: [
          "queued",
          "progress",
          "no-diff-detected",
          "diff-detected",
          "diff-accepted",
          "diff-rejected",
        ],
      },
      buildId: { type: "string" },
    },
  });

  buildId!: string;
  type!:
    | "queued"
    | "progress"
    | "no-diff-detected"
    | "diff-detected"
    | "diff-accepted"
    | "diff-rejected";
  jobStatus!: JobStatus;

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_notifications.buildId",
          to: "builds.id",
        },
      },
    };
  }

  build?: Build;
}
