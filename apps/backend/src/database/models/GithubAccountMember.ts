import { RelationMappings } from "objection";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { GithubAccount } from "./GithubAccount.js";

export class GithubAccountMember extends Model {
  static override tableName = "github_account_members";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubAccountId", "githubMemberId"],
    properties: {
      githubAccountId: { type: "string" },
      githubMemberId: { type: "string" },
    },
  });

  githubAccountId!: string;
  githubMemberId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      githubAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "github_account_members.githubAccountId",
          to: "github_accounts.id",
        },
      },
      githubMember: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "github_account_members.githubMemberId",
          to: "github_accounts.id",
        },
      },
    };
  }
}
