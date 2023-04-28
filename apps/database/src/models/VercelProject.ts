import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project.js";
import { VercelConfiguration } from "./VercelConfiguration.js";

export class VercelProject extends Model {
  static override tableName = "vercel_projects";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["vercelId"],
    properties: {
      vercelId: { type: "string" },
    },
  });

  vercelId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.HasOneRelation,
        modelClass: Project,
        join: {
          from: "vercel_projects.id",
          to: "projects.vercelProjectId",
        },
      },
      activeConfiguration: {
        relation: Model.HasOneThroughRelation,
        modelClass: VercelConfiguration,
        join: {
          from: "vercel_projects.id",
          through: {
            from: "vercel_project_configurations.vercelProjectId",
            to: "vercel_project_configurations.vercelConfigurationId",
          },
          to: "vercel_configurations.id",
        },
        modify(builder) {
          builder.where("vercel_configurations.deleted", false);
        },
      },
    };
  }

  activeConfiguration?: VercelConfiguration | null;
  project?: Project | null;
}
