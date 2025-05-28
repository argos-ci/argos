import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { GithubAccountMember } from "./GithubAccountMember.js";

export class GithubAccount extends Model {
  static override tableName = "github_accounts";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["login", "githubId"],
        properties: {
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          login: { type: "string" },
          githubId: { type: "number" },
          type: { type: "string", enum: ["user", "organization", "bot"] },
          accessToken: { type: ["string", "null"] },
          scope: { type: ["string", "null"] },
          lastLoggedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  name!: string | null;
  email!: string | null;
  login!: string;
  githubId!: number;
  type!: "user" | "organization" | "bot";
  accessToken!: string | null;
  scope!: string | null;
  lastLoggedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "github_accounts.id",
          to: "accounts.githubAccountId",
        },
      },
      members: {
        relation: Model.HasManyRelation,
        modelClass: GithubAccountMember,
        join: {
          from: "github_accounts.id",
          to: "github_account_members.githubAccountId",
        },
      },
    };
  }

  account?: Account;
}
