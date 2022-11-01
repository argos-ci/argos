import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import type { JobStatus } from "../util/schemas.js";
import {
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { User } from "./User.js";

export class Synchronization extends Model {
  static override tableName = "synchronizations";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["type"],
    properties: {
      userId: { type: "string" },
      installationId: { type: "string" },
      type: {
        type: "string",
        enum: ["user", "installation"],
      },
    },
  });

  userId!: string;
  installationId!: string;
  jobStatus!: JobStatus;
  type!: "user" | "installation";

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "synchronizations.userId",
          to: "users.id",
        },
      },
    };
  }

  user?: User;
}
