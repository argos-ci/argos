import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OAuthClient } from "./OAuthClient";
import { OAuthGrantAccount } from "./OAuthGrantAccount";
import { User } from "./User";

export class OAuthGrant extends Model {
  static override tableName = "oauth_grants";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "oauthClientId", "scopes"],
        properties: {
          userId: { type: "string" },
          oauthClientId: { type: "string" },
          scopes: { type: "array", items: { type: "string" } },
          lastUsedAt: { type: ["string", "null"] },
          revokedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  userId!: string;
  oauthClientId!: string;
  scopes!: string[];
  lastUsedAt!: string | null;
  revokedAt!: string | null;

  static override get jsonAttributes() {
    return ["scopes"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "oauth_grants.userId",
          to: "users.id",
        },
      },
      client: {
        relation: Model.BelongsToOneRelation,
        modelClass: OAuthClient,
        join: {
          from: "oauth_grants.oauthClientId",
          to: "oauth_clients.id",
        },
      },
      grantAccounts: {
        relation: Model.HasManyRelation,
        modelClass: OAuthGrantAccount,
        join: {
          from: "oauth_grants.id",
          to: "oauth_grant_accounts.oauthGrantId",
        },
      },
    };
  }

  user?: User;
  client?: OAuthClient;
  grantAccounts?: OAuthGrantAccount[];
}
