import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import type { JobStatus } from "../util/schemas";
import { ProjectEvent } from "./ProjectEvent";

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
          attemptedAt: { type: ["string", "null"] },
          responseStatus: { type: ["integer", "null"] },
          durationMs: { type: ["integer", "null"] },
          responseBody: { type: ["string", "null"] },
          failureReason: { type: ["string", "null"] },
        },
      },
    ],
  };

  webhookId!: string;
  eventId!: string;
  jobStatus!: JobStatus;
  attempts!: number;
  conclusion!: "success" | "failed" | null;
  attemptedAt!: string | null;
  responseStatus!: number | null;
  durationMs!: number | null;
  responseBody!: string | null;
  failureReason!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
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

  event?: ProjectEvent;
}
