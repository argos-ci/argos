import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";

export class GithubAccount extends Model {
  static override tableName = "github_accounts";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["login", "githubId"],
    properties: {
      name: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      login: { type: "string" },
      githubId: { type: "number" },
      type: { type: "string", enum: ["user", "organization"] },
    },
  });

  name!: string | null;
  email!: string | null;
  login!: string;
  githubId!: number;
  type!: "user" | "organization";

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
    };
  }

  account?: Account;
}
