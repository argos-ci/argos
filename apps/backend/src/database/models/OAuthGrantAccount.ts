import type { RelationMappings } from "objection";

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
          samlAuthorized: { type: "boolean" },
        },
      },
    ],
  };

  oauthGrantId!: string;
  accountId!: string;
  /**
   * Whether the token may reach this account while it is a team enforcing
   * SAML: set when it was issued from a session opened through the team's IdP.
   */
  samlAuthorized!: boolean;

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
