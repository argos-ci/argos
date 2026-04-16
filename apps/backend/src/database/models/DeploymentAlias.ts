import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Deployment } from "./Deployment";

export class DeploymentAlias extends Model {
  static override tableName = "deployment_aliases";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["deploymentId", "alias"],
        properties: {
          deploymentId: { type: "string" },
          alias: { type: "string" },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      deployment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Deployment,
        join: {
          from: "deployment_aliases.deploymentId",
          to: "deployments.id",
        },
      },
    };
  }

  deploymentId!: string;
  alias!: string;

  deployment?: Deployment;
}
