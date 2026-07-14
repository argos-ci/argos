import type { JSONSchema, RelationMappings } from "objection";
import { z } from "zod";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OAuthGrant } from "./OAuthGrant";
import { User } from "./User";

const TokenEndpointAuthMethodSchema = z.enum([
  "none",
  "client_secret_basic",
  "client_secret_post",
]);

export class OAuthClient extends Model {
  static override tableName = "oauth_clients";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "clientId",
          "clientName",
          "redirectUris",
          "grantTypes",
          "responseTypes",
          "tokenEndpointAuthMethod",
          "isFirstParty",
          "verified",
        ],
        properties: {
          clientId: { type: "string" },
          clientSecretHash: { type: ["string", "null"] },
          clientName: { type: "string", minLength: 1, maxLength: 255 },
          clientUri: { type: ["string", "null"] },
          logoUri: { type: ["string", "null"] },
          redirectUris: { type: "array", items: { type: "string" } },
          grantTypes: { type: "array", items: { type: "string" } },
          responseTypes: { type: "array", items: { type: "string" } },
          scope: { type: ["string", "null"] },
          tokenEndpointAuthMethod:
            TokenEndpointAuthMethodSchema.toJSONSchema() as JSONSchema,
          softwareId: { type: ["string", "null"] },
          isFirstParty: { type: "boolean" },
          knownAppId: { type: ["string", "null"] },
          verified: { type: "boolean" },
          createdByUserId: { type: ["string", "null"] },
          registrationAccessTokenHash: { type: ["string", "null"] },
        },
      },
    ],
  };

  clientId!: string;
  clientSecretHash!: string | null;
  clientName!: string;
  clientUri!: string | null;
  logoUri!: string | null;
  redirectUris!: string[];
  grantTypes!: string[];
  responseTypes!: string[];
  scope!: string | null;
  tokenEndpointAuthMethod!: z.infer<typeof TokenEndpointAuthMethodSchema>;
  softwareId!: string | null;
  isFirstParty!: boolean;
  knownAppId!: string | null;
  verified!: boolean;
  createdByUserId!: string | null;
  registrationAccessTokenHash!: string | null;

  static override get jsonAttributes() {
    return ["redirectUris", "grantTypes", "responseTypes"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      createdBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "oauth_clients.createdByUserId",
          to: "users.id",
        },
      },
      grants: {
        relation: Model.HasManyRelation,
        modelClass: OAuthGrant,
        join: {
          from: "oauth_clients.id",
          to: "oauth_grants.oauthClientId",
        },
      },
    };
  }

  createdBy?: User | null;
  grants?: OAuthGrant[];
}
