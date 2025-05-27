import type { RelationMappings } from "objection";

import {
  handlers,
  type GetHandlerData,
  type HandlersName,
} from "@/notification/handlers/index.js";

// import {
//   NotificationWorkflowData,
//   NotificationWorkflowType,
//   WORKFLOW_TYPES,
// } from "@/notification/workflow-types.js";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { NotificationMessage } from "./NotificationMessage.js";
import { NotificationWorkflowRecipient } from "./NotificationWorkflowRecipient.js";

export class NotificationWorkflow<
  T extends HandlersName = HandlersName,
> extends Model {
  static override tableName = "notification_workflows";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        oneOf: handlers.map((h) => ({
          type: "object",
          properties: {
            type: { const: h.name },
            data: h.jsonSchema,
          },
          required: ["type", "data"],
        })),
      },
    ],
  };

  jobStatus!: JobStatus;
  type!: T;
  data!: GetHandlerData<T>;

  static override get relationMappings(): RelationMappings {
    return {
      recipients: {
        relation: Model.HasManyRelation,
        modelClass: NotificationWorkflowRecipient,
        join: {
          from: "notification_workflows.id",
          to: "notification_workflow_recipients.workflowId",
        },
      },
      messages: {
        relation: Model.HasManyRelation,
        modelClass: NotificationMessage,
        join: {
          from: "notification_workflows.id",
          to: "notification_messages.workflowId",
        },
      },
    };
  }

  recipients?: NotificationWorkflowRecipient[];
  messages?: NotificationMessage[];
}
