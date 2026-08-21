import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OriginInstallation } from "./OriginInstallation";
import { OriginPullRequest } from "./OriginPullRequest";
import { Project } from "./Project";

/**
 * A Cursor Origin repository the Argos app can reach.
 *
 * Origin has no public repositories — visibility is "internal" (the whole
 * Cursor team) or "private" — so unlike {@link GithubRepository} there is no
 * `private` flag: every Origin repository is private to Argos.
 */
export class OriginRepository extends Model {
  static override tableName = "origin_repositories";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["originId", "name", "ownerSlug", "ownerId", "defaultBranch"],
        properties: {
          originId: { type: "string" },
          name: { type: "string" },
          ownerSlug: { type: "string" },
          ownerId: { type: "string" },
          defaultBranch: { type: "string" },
          originInstallationId: { type: ["string", "null"] },
        },
      },
    ],
  };

  /**
   * The repository ID on Origin.
   */
  originId!: string;
  name!: string;
  ownerSlug!: string;
  ownerId!: string;
  defaultBranch!: string;
  /**
   * The installation serving this repository, `null` once no active
   * installation reaches it anymore.
   */
  originInstallationId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      projects: {
        relation: Model.HasManyRelation,
        modelClass: Project,
        join: {
          from: "origin_repositories.id",
          to: "projects.originRepositoryId",
        },
      },
      installation: {
        relation: Model.BelongsToOneRelation,
        modelClass: OriginInstallation,
        join: {
          from: "origin_repositories.originInstallationId",
          to: "origin_installations.id",
        },
      },
      pullRequests: {
        relation: Model.HasManyRelation,
        modelClass: OriginPullRequest,
        join: {
          from: "origin_repositories.id",
          to: "origin_pull_requests.originRepositoryId",
        },
      },
    };
  }

  projects?: Project[];
  installation?: OriginInstallation | null;
  pullRequests?: OriginPullRequest[];

  static override virtualAttributes = ["fullName", "private"];

  get fullName() {
    return `${this.ownerSlug}/${this.name}`;
  }

  /**
   * Origin repositories are never public.
   */
  get private() {
    return true;
  }
}
