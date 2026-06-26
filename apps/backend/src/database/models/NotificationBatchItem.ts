import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { NotificationBatch } from "./NotificationBatch";
import { NotificationWorkflowRecipient } from "./NotificationWorkflowRecipient";

/**
 * Links a batched notification workflow recipient to its batch. One row per
 * recipient; `workflowRecipientId` is unique so retried workflow jobs don't
 * create duplicate items.
 */
export class NotificationBatchItem extends Model {
  static override tableName = "notification_batch_items";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["batchId", "workflowRecipientId"],
        properties: {
          batchId: { type: "string" },
          workflowRecipientId: { type: "string" },
        },
      },
    ],
  };

  batchId!: string;
  workflowRecipientId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      batch: {
        relation: Model.BelongsToOneRelation,
        modelClass: NotificationBatch,
        join: {
          from: "notification_batch_items.batchId",
          to: "notification_batches.id",
        },
      },
      workflowRecipient: {
        relation: Model.BelongsToOneRelation,
        modelClass: NotificationWorkflowRecipient,
        join: {
          from: "notification_batch_items.workflowRecipientId",
          to: "notification_workflow_recipients.id",
        },
      },
    };
  }

  batch?: NotificationBatch;
  workflowRecipient?: NotificationWorkflowRecipient;
}
