import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import type { JobStatus } from "../util/schemas";
import { ProjectEvent } from "./ProjectEvent";
import { Webhook } from "./Webhook";

/**
 * One event sent to one webhook, across all of its attempts.
 */
export class WebhookDelivery extends Model {
  static override tableName = "webhook_deliveries";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["webhookId", "eventId"],
        properties: {
          webhookId: { type: "string" },
          eventId: { type: "string" },
          attempts: { type: "integer", minimum: 0 },
          conclusion: {
            oneOf: [
              { type: "string", enum: ["success", "failed"] },
              { type: "null" },
            ],
          },
          responseStatus: { type: ["integer", "null"] },
          failureReason: { type: ["string", "null"] },
          completedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  webhookId!: string;
  eventId!: string;
  jobStatus!: JobStatus;
  attempts!: number;
  conclusion!: "success" | "failed" | null;
  responseStatus!: number | null;
  failureReason!: string | null;
  completedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      webhook: {
        relation: Model.BelongsToOneRelation,
        modelClass: Webhook,
        join: {
          from: "webhook_deliveries.webhookId",
          to: "webhooks.id",
        },
      },
      event: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProjectEvent,
        join: {
          from: "webhook_deliveries.eventId",
          to: "project_events.id",
        },
      },
    };
  }

  webhook?: Webhook;
  event?: ProjectEvent;
}
