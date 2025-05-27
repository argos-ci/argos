import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { NotificationWorkflow } from "./NotificationWorkflow.js";
import { User } from "./User.js";

const channels = ["email"] as const;

type NotificationChannel = (typeof channels)[number];

export class NotificationMessage extends Model {
  static override tableName = "notification_messages";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        required: ["userId", "workflowId", "channel"],
        properties: {
          userId: { type: "string" },
          workflowId: { type: "string" },
          channel: { type: "string", enum: channels as unknown as string[] },
          sentAt: { type: ["string", "null"] },
          deliveredAt: { type: ["string", "null"] },
          linkClickedAt: { type: ["string", "null"] },
          externalId: { type: ["string", "null"] },
        },
      },
    ],
  };

  jobStatus!: JobStatus;
  userId!: string;
  workflowId!: string;
  channel!: NotificationChannel;
  /**
   * Message has been processed and sent.
   */
  sentAt!: string | null;
  /**
   * Message has been delivered, example email delivered by our email provider.
   */
  deliveredAt!: string | null;
  /**
   * User clicked on a link in the message.
   */
  linkClickedAt!: string | null;
  /**
   * External ID from the provider, example Resend ID.
   */
  externalId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "notification_messages.userId",
          to: "users.id",
        },
      },
      workflow: {
        relation: Model.BelongsToOneRelation,
        modelClass: NotificationWorkflow,
        join: {
          from: "notification_messages.workflowId",
          to: "notification_workflows.id",
        },
      },
    };
  }

  user?: User;
  workflow?: NotificationWorkflow;
}
