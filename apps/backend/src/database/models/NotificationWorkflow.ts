import type { JSONSchema, RelationMappings } from "objection";
import z from "zod";

import {
  notificationHandlers,
  type NotificationWorkflowProps,
  type NotificationWorkflowType,
} from "@/notification/handlers";

import { Model } from "../util/model";
import { jobModelSchema, JobStatus, timestampsSchema } from "../util/schemas";
import { NotificationMessage } from "./NotificationMessage";
import { NotificationWorkflowRecipient } from "./NotificationWorkflowRecipient";

export class NotificationWorkflow<
  Type extends NotificationWorkflowType = NotificationWorkflowType,
> extends Model {
  static override tableName = "notification_workflows";

  static override get jsonAttributes() {
    return ["data"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        properties: {
          // Scope key (e.g. `build:42`) opting the workflow into batching.
          batchKey: { type: ["string", "null"] },
        },
      },
      {
        anyOf: notificationHandlers.map((h) => ({
          type: "object",
          properties: {
            type: { const: h.type },
            data: z.toJSONSchema(h.schema, { io: "input" }) as JSONSchema,
          },
          required: ["type", "data"],
        })),
      },
    ],
  };

  jobStatus!: JobStatus;
  type!: Type;
  data!: NotificationWorkflowProps<Type>["data"];
  /**
   * When set, the workflow is eligible for batching into a digest keyed by this
   * value. Null workflows send immediately.
   */
  batchKey!: string | null;

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
