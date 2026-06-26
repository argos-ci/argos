import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database";
import {
  Build,
  NotificationBatch,
  NotificationWorkflow,
  UserNotificationPreference,
} from "@/database/models";
import { createModelJob } from "@/job-core";
import parentLogger from "@/logger";

import { parseReviewBuildBatchKey } from "./batch";
import { isConfigurableNotificationCategory } from "./categories";
import type { NotificationWorkflowProps } from "./handlers";
import { sendNotification } from "./index";
import type { NotificationCategory } from "./workflow-types";

const logger = parentLogger.child({ module: "notification-batch" });

/** Max batches a single flush tick closes, to bound the work per cron run. */
const DUE_BATCH_LIMIT = 1000;

/** Max activities rendered in a digest; the rest are summarized as a count. */
const DIGEST_DISPLAY_CAP = 20;

type DigestData = NotificationWorkflowProps<"review_activity_summary">["data"];
type DigestActivity = DigestData["activities"][number];

export const notificationBatchJob = createModelJob(
  "notificationBatch",
  NotificationBatch,
  processNotificationBatch,
);

/**
 * Close every open batch that is due and queue it for delivery. Run on a cron.
 *
 * Rows are locked with `FOR UPDATE SKIP LOCKED` so concurrent runners never
 * pick the same batch, and `closedAt` is stamped in the same transaction so a
 * batch is only ever queued once.
 */
export async function queueDueNotificationBatches(
  now: Date = new Date(),
): Promise<string[]> {
  const ids = await transaction(async (trx) => {
    const batches = await NotificationBatch.query(trx)
      .whereNull("closedAt")
      .where("deliverAfter", "<=", now.toISOString())
      .orderBy("deliverAfter", "asc")
      .limit(DUE_BATCH_LIMIT)
      .forUpdate()
      .skipLocked();
    if (batches.length === 0) {
      return [];
    }
    const batchIds = batches.map((batch) => batch.id);
    await NotificationBatch.query(trx)
      .whereIn("id", batchIds)
      .patch({ closedAt: now.toISOString() });
    return batchIds;
  });

  if (ids.length === DUE_BATCH_LIMIT) {
    logger.warn(
      { limit: DUE_BATCH_LIMIT },
      "Hit the due-batch flush limit; remaining batches flush on the next tick",
    );
  }
  if (ids.length > 0) {
    await notificationBatchJob.push(...ids);
  }
  return ids;
}

export async function processNotificationBatch(
  batch: NotificationBatch,
): Promise<void> {
  await batch.$fetchGraph("[items.workflowRecipient.workflow, user.account]");
  invariant(batch.items, "items must be fetched");
  invariant(batch.user, "user must be fetched");

  // The recipient could have removed their email since the batch opened.
  if (!batch.user.email) {
    return;
  }

  // Re-check preferences at flush time: a user who opted out during the window
  // shouldn't receive the pending digest.
  if (
    isConfigurableNotificationCategory(batch.category as NotificationCategory)
  ) {
    const optedOut = await UserNotificationPreference.query().findOne({
      userId: batch.userId,
      category: batch.category,
      channel: batch.channel,
      enabled: false,
    });
    if (optedOut) {
      return;
    }
  }

  // The digest header is rebuilt from the live build so it stays accurate.
  const buildId = parseReviewBuildBatchKey(batch.batchKey);
  if (!buildId) {
    return;
  }
  const build = await Build.query()
    .findById(buildId)
    .withGraphFetched("project.account");
  if (!build?.project?.account) {
    return;
  }

  const activities = batch.items
    .map((item) => item.workflowRecipient?.workflow)
    .filter((workflow): workflow is NotificationWorkflow => Boolean(workflow))
    .map(mapWorkflowToActivity)
    .filter((activity): activity is DigestActivity => activity !== null)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  if (activities.length === 0) {
    return;
  }

  const totalCount = activities.length;
  const shown = activities.slice(0, DIGEST_DISPLAY_CAP);
  const omittedCount = totalCount - shown.length;
  const buildUrl = await build.getUrl();

  // The digest is itself a (non-batchable) workflow, so the existing
  // workflow/message jobs send the actual email.
  const digestWorkflow = await sendNotification({
    type: "review_activity_summary",
    data: {
      accountSlug: build.project.account.slug,
      projectName: build.project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      activities: shown,
      totalCount,
      omittedCount,
    },
    recipients: [batch.userId],
  });

  await batch.$query().patch({ digestWorkflowId: digestWorkflow.id });
}

/**
 * Map an original notification workflow to a digest activity. Returns null for
 * workflow types that aren't review activity (they never end up batched).
 */
function mapWorkflowToActivity(
  workflow: NotificationWorkflow,
): DigestActivity | null {
  // `createdAt` comes back from the driver as a Date; normalize to an ISO
  // string for the digest payload (its schema and sorting both expect strings).
  const occurredAt = new Date(workflow.createdAt).toISOString();
  const data = workflow.data as Record<string, any>;
  switch (workflow.type) {
    case "comment_added":
    case "comment_replied":
      return {
        type: workflow.type,
        actorName: data["authorName"] ?? null,
        bodyHtml: data["bodyHtml"] ?? null,
        commentUrl: data["commentUrl"] ?? null,
        occurredAt,
      };
    case "comment_reaction":
      return {
        type: "comment_reaction",
        actorName: data["reactorName"] ?? null,
        bodyHtml: data["bodyHtml"] ?? null,
        commentUrl: data["commentUrl"] ?? null,
        commentAuthorId: data["commentAuthorId"] ?? null,
        emoji: data["emoji"] ?? null,
        occurredAt,
      };
    case "review_submitted":
      return {
        type: "review_submitted",
        actorName: data["reviewerName"] ?? null,
        bodyHtml: data["bodyHtml"] ?? null,
        state: data["state"] ?? null,
        occurredAt,
      };
    case "review_dismissed":
      return {
        type: "review_dismissed",
        actorName: data["dismissedByName"] ?? null,
        state: data["state"] ?? null,
        occurredAt,
      };
    default:
      return null;
  }
}
