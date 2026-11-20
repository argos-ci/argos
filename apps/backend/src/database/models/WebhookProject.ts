import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

export class WebhookProject extends Model {
  static override tableName = "webhook_projects";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["webhookId", "projectId"],
        properties: {
          webhookId: { type: "string" },
          projectId: { type: "string" },
        },
      },
    ],
  };

  webhookId!: string;
  projectId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "webhook_projects.projectId",
          to: "projects.id",
        },
      },
    };
  }

  project?: Project;
}
