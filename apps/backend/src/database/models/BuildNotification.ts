import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import type { JobStatus } from "../util/schemas";
import { Build } from "./Build";

export class BuildNotification extends Model {
  static override tableName = "build_notifications";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
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
      },
    ],
  };

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
