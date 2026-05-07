import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import type { JobStatus } from "../util/schemas";
import { Deployment } from "./Deployment";

export class DeploymentNotification extends Model {
  static override tableName = "deployment_notifications";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["type", "deploymentId"],
        properties: {
          type: {
            type: "string",
            enum: ["progress", "success"],
          },
          deploymentId: { type: "string" },
        },
      },
    ],
  };

  deploymentId!: string;
  type!: "progress" | "success";
  jobStatus!: JobStatus;

  static override get relationMappings(): RelationMappings {
    return {
      deployment: {
        relation: Model.BelongsToOneRelation,
        modelClass: Deployment,
        join: {
          from: "deployment_notifications.deploymentId",
          to: "deployments.id",
        },
      },
    };
  }

  deployment?: Deployment;
}
