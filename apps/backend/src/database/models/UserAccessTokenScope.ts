import { AuthMethodSchema, type AuthMethod } from "@argos/schemas/auth-method";
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
          authMethod: {
            type: ["string", "null"],
            enum: [...AuthMethodSchema.options, null],
          },
        },
      },
    ],
  };

  userAccessTokenId!: string;
  accountId!: string;
  /**
   * How the user had signed in for this account, when it is a team, in the
   * session the token was issued from. A team requiring a sign-in method stays
   * out of reach unless it matches.
   */
  authMethod!: AuthMethod | null;

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
