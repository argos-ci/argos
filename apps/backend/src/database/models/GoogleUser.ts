import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";

export class GoogleUser extends Model {
  static override tableName = "google_users";

  static override get jsonAttributes() {
    return ["emails"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["googleId"],
        properties: {
          googleId: { type: "string" },
          name: { type: ["string", "null"] },
          primaryEmail: { type: ["string", "null"] },
          emails: {
            anyOf: [
              { type: "array", items: { type: "string" } },
              { type: "null" },
            ],
          },
          lastLoggedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

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
