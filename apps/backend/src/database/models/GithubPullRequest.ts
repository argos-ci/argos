import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { Build } from "./Build.js";
import { GithubAccount } from "./GithubAccount.js";
import { GithubRepository } from "./GithubRepository.js";

export class GithubPullRequest extends Model {
  static override tableName = "github_pull_requests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        required: ["githubRepositoryId", "number"],
        properties: {
          commentDeleted: { type: "boolean" },
          commentId: { type: ["string", "null"] },
          githubRepositoryId: { type: "string" },
          number: { type: "integer" },
          title: { type: ["string", "null"] },
          baseRef: { type: ["string", "null"] },
          baseSha: { type: ["string", "null"] },
          state: { type: ["string", "null"], enum: ["open", "closed"] },
          date: { type: ["string", "null"] },
          closedAt: { type: ["string", "null"] },
          mergedAt: { type: ["string", "null"] },
          creatorId: { type: ["string", "null"] },
          merged: { type: ["boolean", "null"] },
          draft: { type: ["boolean", "null"] },
        },
      },
    ],
  };

  commentDeleted!: boolean;
  commentId!: string | null;
  jobStatus!: JobStatus;
  githubRepositoryId!: string;
  number!: number;
  title!: string | null;
  baseRef!: string | null;
  baseSha!: string | null;
  state!: "open" | "closed" | null;
  date!: string | null;
  closedAt!: string | null;
  mergedAt!: string | null;
  creatorId!: string | null;
  merged!: boolean | null;
  draft!: boolean | null;

  static override get relationMappings(): RelationMappings {
    return {
      builds: {
        relation: Model.HasManyRelation,
        modelClass: Build,
        join: {
          from: "github_pull_requests.id",
          to: "builds.githubPullRequestId",
        },
        modify: (query) => query.orderBy("id", "desc"),
      },
      githubRepository: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubRepository,
        join: {
          from: "github_pull_requests.githubRepositoryId",
          to: "github_repositories.id",
        },
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "github_pull_requests.creatorId",
          to: "github_accounts.id",
        },
      },
    };
  }

  builds?: Build[];
  githubRepository?: GithubRepository;
  creator?: GithubAccount;
}
