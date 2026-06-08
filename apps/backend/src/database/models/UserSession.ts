import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";

export class UserSession extends Model {
  static override tableName = "user_sessions";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "tokenHash", "expiresAt"],
        properties: {
          userId: { type: "string" },
          tokenHash: { type: "string" },
          lastSeenAt: { type: "string" },
          expiresAt: { type: "string" },
          revokedAt: { type: ["string", "null"] },
          ip: { type: ["string", "null"] },
          userAgent: { type: ["string", "null"] },
          deviceLabel: { type: ["string", "null"] },
        },
      },
    ],
  };

  userId!: string;
  tokenHash!: string;
  lastSeenAt!: string;
  expiresAt!: string;
  revokedAt!: string | null;
  ip!: string | null;
  userAgent!: string | null;
  deviceLabel!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_sessions.userId",
          to: "users.id",
        },
      },
    };
  }

  user?: User;
}
