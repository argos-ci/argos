import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { GithubPullRequest } from "./GithubPullRequest";

export class BuildMergeQueueGhPullRequest extends Model {
  static override tableName = "build_merge_queue_gh_pull_requests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId", "githubPullRequestId"],
        properties: {
          buildId: { type: "string" },
          githubPullRequestId: { type: "string" },
        },
      },
    ],
  };

  buildId!: string;
  githubPullRequestId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_merge_queue_gh_pull_requests.buildId",
          to: "builds.id",
        },
      },
      githubPullRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubPullRequest,
        join: {
          from: "build_merge_queue_gh_pull_requests.githubPullRequestId",
          to: "github_pull_requests.id",
        },
      },
    };
  }

  build?: Build;
  githubPullRequest?: GithubPullRequest;
}
