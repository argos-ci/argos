import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { UserAccessToken } from "./UserAccessToken";

export class UserAccessTokenScope extends Model {
  static override tableName = "user_access_token_scopes";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userAccessTokenId", "accountId"],
        properties: {
          userAccessTokenId: { type: "string" },
          accountId: { type: "string" },
          samlAuthorized: { type: "boolean" },
        },
      },
    ],
  };

  userAccessTokenId!: string;
  accountId!: string;
  /**
   * Whether the token may reach this account while it is a team enforcing
   * SAML: set when it was issued from a session opened through the team's IdP.
   */
  samlAuthorized!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      userAccessToken: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserAccessToken,
        join: {
          from: "user_access_token_scopes.userAccessTokenId",
          to: "user_access_tokens.id",
        },
      },
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "user_access_token_scopes.accountId",
          to: "accounts.id",
        },
      },
    };
  }

  account?: Account;
  userAccessToken?: UserAccessToken;
}
