import { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { GithubInstallation } from "./GithubInstallation";

export class GithubRepositoryInstallation extends Model {
  static override tableName = "github_repository_installations";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["githubRepositoryId", "githubInstallationId"],
        properties: {
          githubRepositoryId: { type: "string" },
          githubInstallationId: { type: "string" },
        },
      },
    ],
  };

  githubRepositoryId!: string;
  githubInstallationId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      installation: {
        relation: Model.HasOneRelation,
        modelClass: GithubInstallation,
        join: {
          from: "github_repository_installations.githubInstallationId",
          to: "github_installations.id",
        },
      },
    };
  }

  installation?: GithubInstallation;
}
