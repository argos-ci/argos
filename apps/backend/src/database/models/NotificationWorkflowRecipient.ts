import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { NotificationWorkflow } from "./NotificationWorkflow.js";
import { User } from "./User.js";

export class NotificationWorkflowRecipient extends Model {
  static override tableName = "notification_workflow_recipients";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "workflowId"],
        properties: {
          userId: { type: "string" },
          workflowId: { type: "string" },
        },
      },
    ],
  };

  userId!: string;
  workflowId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "notification_workflow_recipients.userId",
          to: "users.id",
        },
      },
      workflow: {
        relation: Model.BelongsToOneRelation,
        modelClass: NotificationWorkflow,
        join: {
          from: "notification_workflow_recipients.workflowId",
          to: "notification_workflows.id",
        },
      },
    };
  }

  user?: User;
  workflow?: NotificationWorkflow;
}
