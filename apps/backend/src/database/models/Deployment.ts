import {
  DeploymentEnvironmentSchema,
  DeploymentStatusSchema,
  type DeploymentEnvironment,
  type DeploymentStatus,
} from "@argos/schemas/deployment";
import { invariant } from "@argos/util/invariant";
import { SLUG_REGEX } from "@argos/util/slug";
import type { JSONSchema, RelationMappings } from "objection";

import { DEPLOYMENT_SLUG_MAX_LENGTH } from "@/deployment/slug";
import { getDeploymentUrl } from "@/deployment/url";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { DeploymentAlias } from "./DeploymentAlias";
import { DeploymentNotification } from "./DeploymentNotification";
import { GithubPullRequest } from "./GithubPullRequest";
import { Project } from "./Project";

export class Deployment extends Model {
  static override tableName = "deployments";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["projectId", "status", "environment", "branch", "commitSha"],
        properties: {
          projectId: { type: "string" },
          status: DeploymentStatusSchema.toJSONSchema() as JSONSchema,
          environment: DeploymentEnvironmentSchema.toJSONSchema() as JSONSchema,
          branch: { type: "string" },
          commitSha: { type: "string" },
          slug: {
            type: ["string", "null"],
            pattern: SLUG_REGEX.source,
            maxLength: DEPLOYMENT_SLUG_MAX_LENGTH,
          },
          externalUrl: { type: ["string", "null"] },
          githubPullRequestId: { type: ["string", "null"] },
          prHeadCommit: { type: ["string", "null"] },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "deployments.projectId",
          to: "projects.id",
        },
      },
      aliases: {
        relation: Model.HasManyRelation,
        modelClass: DeploymentAlias,
        join: {
          from: "deployments.id",
          to: "deployment_aliases.deploymentId",
        },
      },
      notifications: {
        relation: Model.HasManyRelation,
        modelClass: DeploymentNotification,
        join: {
          from: "deployments.id",
          to: "deployment_notifications.deploymentId",
        },
      },
      pullRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubPullRequest,
        join: {
          from: "deployments.githubPullRequestId",
          to: "github_pull_requests.id",
        },
      },
    };
  }

  static override virtualAttributes = ["url"];

  projectId!: string;
  status!: DeploymentStatus;
  environment!: DeploymentEnvironment;
  branch!: string;
  commitSha!: string;
  // Exactly one is set: the slug Argos serves the deployment on, or the URL of
  // a deployment hosted elsewhere.
  slug!: string | null;
  externalUrl!: string | null;
  githubPullRequestId!: string | null;
  prHeadCommit!: string | null;

  project?: Project;
  aliases?: DeploymentAlias[];
  notifications?: DeploymentNotification[];
  pullRequest?: GithubPullRequest | null;

  get url() {
    if (this.externalUrl) {
      return this.externalUrl;
    }
    invariant(this.slug, "A deployment served by Argos has a slug");
    return getDeploymentUrl(this.slug);
  }
}
