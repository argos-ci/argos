import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Synchronization } from "./Synchronization.js";
import { User } from "./User.js";

export class Installation extends Model {
  static override tableName = "installations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId"],
    properties: {
      githubId: { type: "number" },
      deleted: { type: "boolean" },
    },
  });

  githubId!: number;
  deleted!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "installations.id",
          through: {
            from: "user_installation_rights.installationId",
            to: "user_installation_rights.userId",
          },
          to: "users.id",
        },
      },
      synchronizations: {
        relation: Model.HasManyRelation,
        modelClass: Synchronization,
        join: {
          from: "installations.id",
          to: "synchronizations.installationId",
        },
        modify(builder) {
          return builder.orderBy("synchronizations.createdAt", "desc");
        },
      },
    };
  }

  users?: User[];
  synchronizations?: Synchronization[];
}
