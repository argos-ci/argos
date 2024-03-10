import { RelationMappings } from "objection";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { User } from "./User.js";
import { Project } from "./Project.js";

export class ProjectUser extends Model {
  static override tableName = "project_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "projectId", "userLevel"],
    properties: {
      userId: { type: "string" },
      projectId: { type: "string" },
      userLevel: { type: "string", enum: ["admin", "reviewer", "viewer"] },
    },
  });

  userId!: string;
  projectId!: string;
  userLevel!: "admin" | "reviewer" | "viewer";

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
