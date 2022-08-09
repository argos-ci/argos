import { Model, mergeSchemas, timestampsSchema } from "../util";
import { User } from "./User";
import { Repository } from "./Repository";

export class UserRepositoryRight extends Model {
  static get tableName() {
    return "user_repository_rights";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["userId", "repositoryId"],
      properties: {
        userId: { type: "string" },
        repositoryId: { type: "string" },
      },
    });
  }

  static get relationMappings() {
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
}
