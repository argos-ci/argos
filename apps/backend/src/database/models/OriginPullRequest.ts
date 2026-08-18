import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, JobStatus, timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { OriginRepository } from "./OriginRepository";

/**
 * A pull request on a Cursor Origin repository.
 *
 * Mirrors {@link GithubPullRequest}. Origin has no forks, so there is no
 * `headFromFork`, and its API only exposes an author's id and email, so there
 * is no creator account either.
 */
export class OriginPullRequest extends Model {
  static override tableName = "origin_pull_requests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["originRepositoryId", "number"],
        properties: {
          originRepositoryId: { type: "string" },
          number: { type: "integer" },
          originId: { type: ["string", "null"] },
          title: {
            oneOf: [{ type: "string", maxLength: 255 }, { type: "null" }],
          },
          headRef: { type: ["string", "null"], maxLength: 255 },
          baseRef: { type: ["string", "null"], maxLength: 255 },
          baseSha: { type: ["string", "null"] },
          state: { type: ["string", "null"], enum: ["open", "closed"] },
          date: { type: ["string", "null"] },
          closedAt: { type: ["string", "null"] },
          mergedAt: { type: ["string", "null"] },
          merged: { type: ["boolean", "null"] },
          draft: { type: ["boolean", "null"] },
          commentId: { type: ["string", "null"] },
          commentDeleted: { type: "boolean" },
          mediaCommentId: { type: ["string", "null"] },
          mediaCommentDeleted: { type: "boolean" },
        },
      },
    ],
  };

  jobStatus!: JobStatus;
  originRepositoryId!: string;
  number!: number;
  /**
   * The stable pull request ID on Origin, known once fetched.
   */
  originId!: string | null;
  title!: string | null;
  /** The branch the pull request is *from*. */
  headRef!: string | null;
  /** The branch the pull request merges *into*. */
  baseRef!: string | null;
  baseSha!: string | null;
  state!: "open" | "closed" | null;
  date!: string | null;
  closedAt!: string | null;
  mergedAt!: string | null;
  merged!: boolean | null;
  draft!: boolean | null;
  /**
   * The managed comment listing the builds of the pull request. `commentId` is
   * the Origin comment ID; `commentDeleted` remembers a comment Origin no
   * longer knows, so it is never recreated.
   */
  commentId!: string | null;
  commentDeleted!: boolean;
  mediaCommentId!: string | null;
  mediaCommentDeleted!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      builds: {
        relation: Model.HasManyRelation,
        modelClass: Build,
        join: {
          from: "origin_pull_requests.id",
          to: "builds.originPullRequestId",
        },
        modify: (query) => query.orderBy("id", "desc"),
      },
      originRepository: {
        relation: Model.BelongsToOneRelation,
        modelClass: OriginRepository,
        join: {
          from: "origin_pull_requests.originRepositoryId",
          to: "origin_repositories.id",
        },
      },
    };
  }

  builds?: Build[];
  originRepository?: OriginRepository;
}
