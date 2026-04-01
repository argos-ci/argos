import type { RelationMappings } from "objection";

import { generateRandomHexString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";
import { UserAccessTokenScope } from "./UserAccessTokenScope";

const UserAccessTokenPrefix = "arp_";

export class UserAccessToken extends Model {
  static override tableName = "user_access_tokens";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "name", "token", "createdBy"],
        properties: {
          userId: { type: "string" },
          name: { type: "string" },
          token: { type: "string" },
          expireAt: { type: ["string", "null"] },
          lastUsedAt: { type: ["string", "null"] },
          createdBy: { type: "string", enum: ["user", "cli"] },
        },
      },
    ],
  };

  userId!: string;
  name!: string;
  token!: string;
  expireAt!: string | null;
  lastUsedAt!: string | null;
  createdBy!: "user" | "cli";

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_access_tokens.userId",
          to: "users.id",
        },
      },
      scope: {
        relation: Model.HasManyRelation,
        modelClass: UserAccessTokenScope,
        join: {
          from: "user_access_tokens.id",
          to: "user_access_token_scopes.userAccessTokenId",
        },
      },
    };
  }

  user?: User;
  scope?: UserAccessTokenScope[];

  /**
   * Generate a new user access token.
   */
  static generateToken() {
    const token = generateRandomHexString(36);
    return `${UserAccessTokenPrefix}${token}`;
  }

  /**
   * Check if a token string matches the format of a user access token.
   */
  static isValidUserAccessToken(token: string): boolean {
    return token.startsWith(UserAccessTokenPrefix) && token.length === 40;
  }
}
