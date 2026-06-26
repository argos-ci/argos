import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { jobModelSchema, JobStatus, timestampsSchema } from "../util/schemas";
import { NotificationBatchItem } from "./NotificationBatchItem";
import { NotificationWorkflow } from "./NotificationWorkflow";
import { User } from "./User";

const channels = ["email"] as const;

type NotificationChannel = (typeof channels)[number];

/**
 * A durable, debounced digest of review/comment activity for a single
 * recipient and scope (e.g. one build). Activity accumulates into one open
 * batch (`closedAt IS NULL`) until `deliverAfter` is due, then a digest
 * notification is sent. See `notification/batch.ts` and `batch-job.ts`.
 */
export class NotificationBatch extends Model {
  static override tableName = "notification_batches";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: [
          "userId",
          "channel",
          "category",
          "batchKind",
          "batchKey",
          "firstEventAt",
          "lastEventAt",
          "deliverAfter",
          "maxDeliverAfter",
        ],
        properties: {
          userId: { type: "string" },
          channel: { type: "string", enum: channels as unknown as string[] },
          category: { type: "string" },
          batchKind: { type: "string" },
          batchKey: { type: "string" },
          firstEventAt: { type: "string" },
          lastEventAt: { type: "string" },
          deliverAfter: { type: "string" },
          maxDeliverAfter: { type: "string" },
          closedAt: { type: ["string", "null"] },
          digestWorkflowId: { type: ["string", "null"] },
        },
      },
    ],
  };

  jobStatus!: JobStatus;
  userId!: string;
  channel!: NotificationChannel;
  /** Notification category (e.g. "review"), re-checked against preferences at flush time. */
  category!: string;
  /** Kind of digest this batch produces (e.g. "review_activity"). */
  batchKind!: string;
  /** Scope of the batch (e.g. `build:42`). */
  batchKey!: string;
  firstEventAt!: string;
  lastEventAt!: string;
  /** When the batch becomes due for delivery. */
  deliverAfter!: string;
  /** Hard cap on `deliverAfter` so an active discussion can't postpone delivery forever. */
  maxDeliverAfter!: string;
  /** Set when the batch is closed for delivery; null while still accumulating. */
  closedAt!: string | null;
  /** The digest workflow created at flush time, once delivered. */
  digestWorkflowId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      items: {
        relation: Model.HasManyRelation,
        modelClass: NotificationBatchItem,
        join: {
          from: "notification_batches.id",
          to: "notification_batch_items.batchId",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "notification_batches.userId",
          to: "users.id",
        },
      },
      digestWorkflow: {
        relation: Model.BelongsToOneRelation,
        modelClass: NotificationWorkflow,
        join: {
          from: "notification_batches.digestWorkflowId",
          to: "notification_workflows.id",
        },
      },
    };
  }

  items?: NotificationBatchItem[];
  user?: User;
  digestWorkflow?: NotificationWorkflow | null;
}
