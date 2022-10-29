import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Organization } from "./Organization.js";
import { User } from "./User.js";

export class UserOrganizationRight extends Model {
  static override tableName = "user_organization_rights";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["userId", "organizationId"],
    properties: {
      userId: { type: "string" },
      organizationId: { type: "string" },
    },
  });

  userId!: string;
  organizationId!: string;

  static override get relationMappings(): RelationMappings {
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

  user?: User;
  organization?: Organization;
}
