import { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { UserLevel, UserLevelJsonSchema } from "../util/user-level.js";
import { Project } from "./Project.js";
import { User } from "./User.js";

export class ProjectUser extends Model {
  static override tableName = "project_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "projectId", "userLevel"],
    properties: {
      userId: { type: "string" },
      projectId: { type: "string" },
      userLevel: UserLevelJsonSchema,
    },
  });

  userId!: string;
  projectId!: string;
  userLevel!: UserLevel;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "project_users.userId",
          to: "users.id",
        },
      },
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "project_users.projectId",
          to: "projects.id",
        },
      },
    };
  }
}
