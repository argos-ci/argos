import { Model, mergeSchemas, timestampsSchema } from "../util";
import { Organization } from "./Organization";
import { User } from "./User";

export class UserOrganizationRight extends Model {
  static get tableName() {
    return "user_organization_rights";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["userId", "organizationId"],
      properties: {
        userId: { type: "string" },
        organizationId: { type: "string" },
      },
    });
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_organization_rights.userId",
          to: "users.id",
        },
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: "user_organization_rights.organizationId",
          to: "organizations.id",
        },
      },
    };
  }
}
