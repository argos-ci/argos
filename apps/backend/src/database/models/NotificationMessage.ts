import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { NotificationWorkflow } from "./NotificationWorkflow.js";
import { User } from "./User.js";

const channels = ["email"] as const;

type NotificationChannel = (typeof channels)[number];

export class NotificationMessage extends Model {
  static override tableName = "notification_messages";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["userId", "workflowId", "channel"],
    properties: {
      userId: { type: "string" },
      workflowId: { type: "string" },
      channel: { type: "string", enum: channels as unknown as string[] },
      deliveredAt: { type: ["string", "null"] },
      seenAt: { type: ["string", "null"] },
    },
  });

  jobStatus!: JobStatus;
  userId!: string;
  workflowId!: string;
  channel!: NotificationChannel;
  deliveredAt!: string | null;
  seenAt!: string | null;

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
