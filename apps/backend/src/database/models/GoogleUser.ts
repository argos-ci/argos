import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { User } from "./User.js";

export class GoogleUser extends Model {
  static override tableName = "google_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["googleId"],
    properties: {
      googleId: { type: "string" },
      name: { type: ["string", "null"] },
      primaryEmail: { type: ["string", "null"] },
      emails: {
        oneOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
      },
      lastLoggedAt: { type: ["string", "null"] },
    },
  });

  googleId!: string;
  name!: string | null;
  primaryEmail!: string | null;
  emails!: string[] | null;
  lastLoggedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "google_users.id",
          to: "users.googleUserId",
        },
      },
    };
  }

  user?: User;
}
