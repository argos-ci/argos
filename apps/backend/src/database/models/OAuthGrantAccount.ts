import type { RelationMappings } from "objection";

import { AUTH_METHODS, type AuthMethod } from "@/auth/auth-method";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { OAuthGrant } from "./OAuthGrant";

export class OAuthGrantAccount extends Model {
  static override tableName = "oauth_grant_accounts";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["oauthGrantId", "accountId"],
        properties: {
          oauthGrantId: { type: "string" },
          accountId: { type: "string" },
          authMethod: {
            type: ["string", "null"],
            enum: [...AUTH_METHODS, null],
          },
        },
      },
    ],
  };

  oauthGrantId!: string;
  accountId!: string;
  /**
   * How the user had signed in for this account, when it is a team, in the
   * session the token was issued from. A team requiring a sign-in method stays
   * out of reach unless it matches.
   */
  authMethod!: AuthMethod | null;

  static override get relationMappings(): RelationMappings {
    return {
      grant: {
        relation: Model.BelongsToOneRelation,
        modelClass: OAuthGrant,
        join: {
          from: "oauth_grant_accounts.oauthGrantId",
          to: "oauth_grants.id",
        },
      },
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "oauth_grant_accounts.accountId",
          to: "accounts.id",
        },
      },
    };
  }

  grant?: OAuthGrant;
  account?: Account;
}
