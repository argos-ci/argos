import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Installation } from "./Installation.js";
import { User } from "./User.js";

export class UserInstallationRight extends Model {
  static override tableName = "user_installation_rights";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "installationId"],
    properties: {
      userId: { type: "string" },
      installationId: { type: "string" },
    },
  });

  userId!: string;
  installationId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_installation_rights.userId",
          to: "users.id",
        },
      },
      installation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Installation,
        join: {
          from: "user_installation_rights.installationId",
          to: "installations.id",
        },
      },
    };
  }

  user?: User;
  installation?: Installation;
}
