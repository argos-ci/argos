import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Repository } from "./Repository.js";
import { User } from "./User.js";

export class UserRepositoryRight extends Model {
  static override tableName = "user_repository_rights";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "repositoryId"],
    properties: {
      userId: { type: "string" },
      repositoryId: { type: "string" },
    },
  });

  userId!: string;
  repositoryId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_repository_rights.userId",
          to: "users.id",
        },
      },
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: "user_repository_rights.repositoryId",
          to: "repositories.id",
        },
      },
    };
  }

  user?: User;
  repository?: Repository;
}
