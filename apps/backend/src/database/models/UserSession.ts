import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";

export class UserSession extends Model {
  static override tableName = "user_sessions";

  static authMethods = [
    "email",
    "google",
    "github",
    "gitlab",
    "saml",
    "passkey",
  ] as const;

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
          city: { type: ["string", "null"] },
          region: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          authMethod: {
            type: ["string", "null"],
            enum: [...UserSession.authMethods, null],
          },
          samlTeamId: { type: ["string", "null"] },
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
  city!: string | null;
  region!: string | null;
  country!: string | null;
  /** How the session was opened. Null on sessions predating the column. */
  authMethod!: (typeof UserSession.authMethods)[number] | null;
  /**
   * The team whose SAML IdP vouched for the user when the session was opened:
   * the one team whose SAML enforcement this session satisfies.
   */
  samlTeamId!: string | null;

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
