import type { RelationMappings } from "objection";

import config from "@/config";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

type DeploymentStatus = "pending" | "ready" | "error";
type DeploymentEnvironment = "preview" | "production";

export class Deployment extends Model {
  static override tableName = "storybook_deployments";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["projectId", "status", "environment"],
        properties: {
          projectId: { type: "string" },
          status: {
            type: "string",
            enum: ["pending", "ready", "error"],
          },
          environment: {
            type: "string",
            enum: ["preview", "production"],
          },
          slug: { type: "string" },
          branch: { type: ["string", "null"] },
          commitSha: { type: ["string", "null"] },
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
          from: "storybook_deployments.projectId",
          to: "projects.id",
        },
      },
    };
  }

  static override virtualAttributes = ["url"];

  projectId!: string;
  status!: DeploymentStatus;
  environment!: DeploymentEnvironment;
  branch!: string | null;
  commitSha!: string | null;
  githubPullRequestId!: string | null;
  slug!: string | null;

  project?: Project;

  get url() {
    const baseDomain = config.get("deployments.baseDomain");
    return new URL(`https://${this.slug}.${baseDomain}`).href;
  }
}
