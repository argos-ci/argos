import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { GithubOrganization } from "./GithubOrganization.js";
import { GithubUser } from "./GithubUser.js";

export class GithubAccount extends Model {
  static override tableName = "github_accounts";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
    properties: {
      githubUserId: { type: ["string", "null"] },
      githubOrganizationId: { type: ["string", "null"] },
    },
  });

  githubUserId!: string | null;
  githubOrganizationId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: GithubUser,
        join: {
          from: "github_accounts.githubUserId",
          to: "github_users.id",
        },
      },
      organization: {
        relation: Model.HasOneRelation,
        modelClass: GithubOrganization,
        join: {
          from: "github_accounts.githubOrganizationId",
          to: "github_organizations.id",
        },
      },
    };
  }

  user?: GithubUser | null;
  organization?: GithubOrganization | null;
}
