import {
  DeploymentEnvironmentSchema,
  type DeploymentEnvironment,
} from "@argos/schemas/deployment";
import type { JSONSchema, RelationMappings } from "objection";

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
          environment: DeploymentEnvironmentSchema.toJSONSchema() as JSONSchema,
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
