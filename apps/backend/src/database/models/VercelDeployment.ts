import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { VercelCheck } from "./VercelCheck.js";
import { VercelProject } from "./VercelProject.js";

export class VercelDeployment extends Model {
  static override tableName = "vercel_deployments";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["vercelId", "vercelProjectId", "url"],
    properties: {
      vercelId: { type: "string" },
      vercelProjectId: { type: "string" },
      url: { type: "string" },
      githubCommitRef: { type: ["string", "null"] },
      githubCommitSha: { type: ["string", "null"] },
      githubPrId: { type: ["string", "null"] },
    },
  });

  vercelId!: string;
  vercelProjectId!: string;
  url!: string;
  githubCommitRef!: string | null;
  githubCommitSha!: string | null;
  githubPrId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      vercelProject: {
        relation: Model.BelongsToOneRelation,
        modelClass: VercelProject,
        join: {
          from: "vercel_deployments.vercelProjectId",
          to: "vercel_projects.id",
        },
      },
      vercelCheck: {
        relation: Model.HasOneRelation,
        modelClass: VercelCheck,
        join: {
          from: "vercel_deployments.id",
          to: "vercel_checks.vercelDeploymentId",
        },
      },
    };
  }

  vercelProject?: VercelProject | null;
  vercelCheck?: VercelCheck | null;
}
