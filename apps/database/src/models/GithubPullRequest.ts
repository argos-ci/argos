import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { GithubRepository } from "./GithubRepository.js";

export class PullRequest extends Model {
  static override tableName = "github_pull_requests";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubRepositoryId", "number"],
    properties: {
      commentDeleted: { type: "boolean" },
      commentId: { type: ["number", "null"] },
      githubRepositoryId: { type: "string" },
      number: { type: "integer" },
    },
  });

  commentDeleted!: boolean;
  commentId!: number | null;
  githubRepositoryId!: string;
  number!: number;

  static override get relationMappings(): RelationMappings {
    return {
      builds: {
        relation: Model.HasManyRelation,
        modelClass: Build,
        join: {
          from: "github_pull_requests.id",
          to: "builds.githubPullRequestId",
        },
      },
      githubRepository: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubRepository,
        join: {
          from: "github_pull_requests.githubRepositoryId",
          to: "github_repositories.id",
        },
      },
    };
  }

  builds?: Build[];
  githubRepository?: GithubRepository;
}
