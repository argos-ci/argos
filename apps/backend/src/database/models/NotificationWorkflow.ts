import type { JSONSchema, RelationMappings } from "objection";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
  notificationHandlers,
  type NotificationWorkflowData,
  type NotificationWorkflowType,
} from "@/notification/handlers/index.js";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { NotificationMessage } from "./NotificationMessage.js";
import { NotificationWorkflowRecipient } from "./NotificationWorkflowRecipient.js";

export class NotificationWorkflow<
  Type extends NotificationWorkflowType = NotificationWorkflowType,
> extends Model {
  static override tableName = "notification_workflows";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        oneOf: notificationHandlers.map((h) => ({
          type: "object",
          properties: {
            type: { const: h.type },
            data: zodToJsonSchema(h.schema, {
              removeAdditionalStrategy: "strict",
            }) as JSONSchema,
          },
          required: ["type", "data"],
        })),
      },
    ],
  };

  jobStatus!: JobStatus;
  type!: Type;
  data!: NotificationWorkflowData<Type>;

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
