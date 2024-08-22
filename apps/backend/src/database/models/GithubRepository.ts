import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { GithubAccount } from "./GithubAccount.js";
import { GithubInstallation } from "./GithubInstallation.js";
import { GithubPullRequest } from "./GithubPullRequest.js";
import { Project } from "./Project.js";

export class GithubRepository extends Model {
  static override tableName = "github_repositories";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [
      "name",
      "private",
      "defaultBranch",
      "githubId",
      "githubAccountId",
    ],
    properties: {
      name: { type: "string" },
      private: { type: "boolean" },
      defaultBranch: { type: "string" },
      githubId: { type: "number" },
      githubAccountId: { type: "string" },
    },
  });

  name!: string;
  private!: boolean;
  defaultBranch!: string;
  githubId!: number;
  githubAccountId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      projects: {
        relation: Model.HasManyRelation,
        modelClass: Project,
        join: {
          from: "github_repositories.id",
          to: "projects.githubRepositoryId",
        },
      },
      githubAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "github_repositories.githubAccountId",
          to: "github_accounts.id",
        },
      },
      activeInstallations: {
        relation: Model.HasManyRelation,
        modelClass: GithubInstallation,
        join: {
          from: "github_repositories.id",
          through: {
            from: "github_repository_installations.githubRepositoryId",
            to: "github_repository_installations.githubInstallationId",
          },
          to: "github_installations.id",
        },
        modify(builder) {
          builder.where("github_installations.deleted", false);
        },
      },
      pullRequests: {
        relation: Model.HasManyRelation,
        modelClass: GithubPullRequest,
        join: {
          from: "github_repositories.id",
          to: "github_pull_requests.githubRepositoryId",
        },
      },
    };
  }

  githubAccount?: GithubAccount;
  activeInstallations?: GithubInstallation[] | null;
  projects?: Project[] | null;

  static pickBestInstallation(installations: GithubInstallation[]) {
    return (
      installations.find((installation) => installation.app === "main") ??
      installations[0] ??
      null
    );
  }
}
