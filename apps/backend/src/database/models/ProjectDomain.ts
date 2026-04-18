import type { RelationMappings } from "objection";

import {
  deploymentEnvironmentJsonSchema,
  type DeploymentEnvironment,
} from "../util/deployment-environment";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

export class ProjectDomain extends Model {
  static override tableName = "project_domains";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["domain", "environment", "projectId", "internal"],
        properties: {
          domain: { type: "string" },
          environment: deploymentEnvironmentJsonSchema,
          branch: { type: ["string", "null"] },
          projectId: { type: "string" },
          internal: { type: "boolean" },
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
          from: "project_domains.projectId",
          to: "projects.id",
        },
      },
    };
  }

  domain!: string;
  environment!: DeploymentEnvironment;
  branch!: string | null;
  projectId!: string;
  internal!: boolean;

  project?: Project;
}
