import type { RelationMappings } from "objection";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OAuthGrant } from "./OAuthGrant";

const OAuthAccessTokenPrefix = "argos_oat_";

export class OAuthAccessToken extends Model {
  static override tableName = "oauth_access_tokens";

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
          lastUsedAt: { type: ["string", "null"] },
          revokedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  oauthGrantId!: string;
  tokenHash!: string;
  scopes!: string[];
  resource!: string | null;
  expiresAt!: string;
  lastUsedAt!: string | null;
  revokedAt!: string | null;

  static override get jsonAttributes() {
    return ["scopes"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      grant: {
        relation: Model.BelongsToOneRelation,
        modelClass: OAuthGrant,
        join: {
          from: "oauth_access_tokens.oauthGrantId",
          to: "oauth_grants.id",
        },
      },
    };
  }

  grant?: OAuthGrant;

  /**
   * Generate a new opaque OAuth access token (returned to the client once).
   */
  static generateToken() {
    return `${OAuthAccessTokenPrefix}${generateRandomString(40)}`;
  }

  /**
   * Check if a token string matches the format of an OAuth access token.
   */
  static isOAuthAccessToken(token: string): boolean {
    return token.startsWith(OAuthAccessTokenPrefix);
  }
}
