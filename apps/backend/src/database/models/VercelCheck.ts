import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { VercelDeployment } from "./VercelDeployment.js";

export class VercelCheck extends Model {
  static override tableName = "vercel_checks";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["vercelId", "vercelDeploymentId"],
    properties: {
      vercelId: { type: "string" },
      vercelDeploymentId: { type: "string" },
      buildId: { type: "string" },
    },
  });

  vercelId!: string;
  vercelDeploymentId!: string;
  buildId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      vercelDeployment: {
        relation: Model.BelongsToOneRelation,
        modelClass: VercelDeployment,
        join: {
          from: "vercel_checks.vercelDeploymentId",
          to: "vercel_deployments.id",
        },
      },
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "vercel_checks.buildId",
          to: "builds.id",
        },
      },
    };
  }

  vercelDeployment?: VercelDeployment | null;
  build?: Build | null;
}
