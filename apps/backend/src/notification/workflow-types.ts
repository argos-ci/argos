import type { z } from "zod";

type HandlerContext = {
  user: {
    /** ID of the recipient. Lets handlers personalize copy (e.g. "your comment"). */
    id: string;
    name: string | null;
  };
  /**
   * URL to the user's notification preferences, or null when the notification
   * is not configurable.
   */
  preferencesUrl: string | null;
};

/**
 * Category used to group notifications when a user configures which
 * notifications they want to receive.
 */
export type NotificationCategory =
  | "account"
  | "security"
  | "review"
  | "billing"
  | "project"
  | "integration";

/**
 * Kind of digest a batchable notification rolls up into. Each kind maps to a
 * single digest handler (e.g. `review_activity` → `review_activity_summary`).
 */
export type NotificationBatchKind = "review_activity";

/**
 * Batching metadata a handler opts into. When present (and the workflow carries
 * a `batchKey`), the workflow job rolls events into a debounced digest instead
 * of sending immediately.
 */
export type NotificationBatchConfig = {
  kind: NotificationBatchKind;
  /** Delay added on each new event before the batch becomes due. */
  debounceMs: number;
  /** Hard cap from the first event, so an active discussion can't postpone delivery forever. */
  maxDelayMs: number;
  /** Once this many events accumulate, the batch flushes early. */
  maxItems: number;
};

/**
 * Shared batching config for review/comment activity. All review-activity
 * handlers reference this so a single user gets one digest per build.
 */
export const REVIEW_ACTIVITY_BATCH: NotificationBatchConfig = {
  kind: "review_activity",
  debounceMs: 5 * 60 * 1000,
  maxDelayMs: 30 * 60 * 1000,
  maxItems: 20,
};

export type NotificationHandler<TType extends string = string, TData = any> = {
  type: TType;
  /**
   * Category this notification belongs to. Whether it is configurable is
   * derived from the category metadata.
   */
  category: NotificationCategory;
  /**
   * When set, notifications of this type can be batched into a digest. Only
   * applies to workflows that also carry a `batchKey`.
   */
  batch?: NotificationBatchConfig;
  schema: z.ZodType<TData>;
  previewData: TData;
  email: (props: TData & { ctx: HandlerContext }) => {
    subject: string;
    body: React.JSX.Element;
  };
};

export function defineNotificationHandler<TName extends string, TData>(
  handler: NotificationHandler<TName, TData>,
): NotificationHandler<TName, TData> {
  return handler;
}
