import type { RelationMappings } from "objection";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OAuthGrant } from "./OAuthGrant";

const OAuthRefreshTokenPrefix = "argos_ort_";

export class OAuthRefreshToken extends Model {
  static override tableName = "oauth_refresh_tokens";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["oauthGrantId", "tokenHash", "scopes", "expiresAt"],
        properties: {
          oauthGrantId: { type: "string" },
          tokenHash: { type: "string", minLength: 64, maxLength: 64 },
          scopes: { type: "array", items: { type: "string" } },
          resource: { type: ["string", "null"] },
          expiresAt: { type: "string" },
          revokedAt: { type: ["string", "null"] },
          replacedByTokenId: { type: ["string", "null"] },
        },
      },
    ],
  };

  oauthGrantId!: string;
  tokenHash!: string;
  scopes!: string[];
  resource!: string | null;
  expiresAt!: string;
  revokedAt!: string | null;
  replacedByTokenId!: string | null;

  static override get jsonAttributes() {
    return ["scopes"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      grant: {
        relation: Model.BelongsToOneRelation,
        modelClass: OAuthGrant,
        join: {
          from: "oauth_refresh_tokens.oauthGrantId",
          to: "oauth_grants.id",
        },
      },
    };
  }

  grant?: OAuthGrant;

  /**
   * Generate a new opaque OAuth refresh token (returned to the client once).
   */
  static generateToken() {
    return `${OAuthRefreshTokenPrefix}${generateRandomString(40)}`;
  }

  /**
   * Check if a token string matches the format of an OAuth refresh token.
   */
  static isOAuthRefreshToken(token: string): boolean {
    return token.startsWith(OAuthRefreshTokenPrefix);
  }
}
