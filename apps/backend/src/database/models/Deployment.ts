import {
  DeploymentEnvironmentSchema,
  DeploymentStatusSchema,
  type DeploymentEnvironment,
  type DeploymentStatus,
} from "@argos/schemas/deployment";
import type { JSONSchema, RelationMappings } from "objection";

import { getDeploymentUrl } from "@/deployment/url";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

export class Deployment extends Model {
  static override tableName = "deployments";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: [
          "projectId",
          "status",
          "environment",
          "branch",
          "commitSha",
          "slug",
        ],
        properties: {
          projectId: { type: "string" },
          status: DeploymentStatusSchema.toJSONSchema() as JSONSchema,
          environment: DeploymentEnvironmentSchema.toJSONSchema() as JSONSchema,
          branch: { type: "string" },
          commitSha: { type: "string" },
          slug: { type: "string" },
          githubPullRequestId: { type: ["string", "null"] },
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
    };
  }

  static override virtualAttributes = ["url"];

  projectId!: string;
  status!: DeploymentStatus;
  environment!: DeploymentEnvironment;
  branch!: string;
  commitSha!: string;
  slug!: string;
  githubPullRequestId!: string | null;

  project?: Project;

  get url() {
    return getDeploymentUrl(this.slug);
  }
}
