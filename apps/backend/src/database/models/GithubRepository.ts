import { invariant } from "@argos/util/invariant";
import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { GithubAccount } from "./GithubAccount.js";
import { GithubPullRequest } from "./GithubPullRequest.js";
import { GithubRepositoryInstallation } from "./GithubRepositoryInstallation.js";
import { Project } from "./Project.js";

export class GithubRepository extends Model {
  static override tableName = "github_repositories";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
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
      },
    ],
  };

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
      repoInstallations: {
        relation: Model.HasManyRelation,
        modelClass: GithubRepositoryInstallation,
        join: {
          from: "github_repositories.id",
          to: "github_repository_installations.githubRepositoryId",
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

  projects?: Project[];
  githubAccount?: GithubAccount;
  repoInstallations?: GithubRepositoryInstallation[];
  pullRequests?: GithubPullRequest[];

  static pickBestInstallation(repository: GithubRepository) {
    invariant(
      repository.repoInstallations,
      "Relation `repoInstallations` not loaded",
    );

    const installations = repository.repoInstallations.map(
      (repoInstallation) => {
        invariant(
          repoInstallation.installation,
          'Relation "installation" not loaded',
        );
        return repoInstallation.installation;
      },
    );

    const activeInstallations = installations.filter(
      (installation) => !installation.deleted,
    );

    return (
      activeInstallations.find((installation) => installation.app === "main") ??
      activeInstallations[0] ??
      null
    );
  }
}
