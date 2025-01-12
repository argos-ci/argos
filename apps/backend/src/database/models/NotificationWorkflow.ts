import type { RelationMappings } from "objection";

import { SpendLimitThreshold } from "../services/spend-limit.js";
import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { NotificationMessage } from "./NotificationMessage.js";
import { NotificationWorkflowRecipient } from "./NotificationWorkflowRecipient.js";

const workflowTypes = ["welcome", "spend_limit"] as const;

export type NotificationWorkflowType = (typeof workflowTypes)[number];

export type NotificationWorkflowData = {
  spend_limit: {
    threshold: SpendLimitThreshold;
    accountName: string | null;
    accountSlug: string;
  };
  welcome: Record<string, never>;
};

export class NotificationWorkflow<
  Type extends NotificationWorkflowType = NotificationWorkflowType,
> extends Model {
  static override tableName = "notification_workflows";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["type", "data"],
    properties: {
      type: { type: "string", enum: workflowTypes as unknown as string[] },
      data: { type: "object" },
    },
  });

  jobStatus!: JobStatus;
  type!: Type;
  data!: NotificationWorkflowData[Type];

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
