import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database";
import type { NotificationWorkflow } from "@/database/models";

import type { NotificationBatchConfig } from "./workflow-types";

/**
 * Batch key grouping all review activity on a single build, so a recipient gets
 * one digest per build.
 */
export function reviewBuildBatchKey(buildId: string): string {
  return `build:${buildId}`;
}

/**
 * Extract the build id from a review-activity batch key, or null if the key
 * isn't a build scope.
 */
export function parseReviewBuildBatchKey(batchKey: string): string | null {
  const match = /^build:(.+)$/.exec(batchKey);
  return match ? match[1]! : null;
}

/**
 * Roll a batchable workflow's recipients into their open batches instead of
 * sending immediately.
 *
 * For each recipient we upsert the single open batch for their scope and add
 * one batch item. The upsert is atomic (`ON CONFLICT` on the partial unique
 * index), so concurrent workflow jobs for the same recipient and build can't
 * create duplicate open batches. Items are unique per workflow recipient, so a
 * retried workflow job that partially inserted items stays idempotent.
 */
export async function enqueueWorkflowForBatching(input: {
  workflow: Pick<NotificationWorkflow, "batchKey">;
  batch: NotificationBatchConfig;
  category: string;
  recipients: Array<{ id: string; userId: string }>;
}): Promise<void> {
  const { workflow, batch, category, recipients } = input;
  invariant(workflow.batchKey, "workflow must have a batchKey to be batched");
  if (recipients.length === 0) {
    return;
  }
  const batchKey = workflow.batchKey;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const deliverAfter = new Date(now + batch.debounceMs).toISOString();
  const maxDeliverAfter = new Date(now + batch.maxDelayMs).toISOString();

  await transaction(async (trx) => {
    for (const recipient of recipients) {
      // Upsert the single open batch for this recipient + scope. On conflict we
      // extend the debounce window, but never past the batch's max delivery
      // time (`maxDeliverAfter`), so an active discussion can't defer email
      // forever.
      const rows = await trx("notification_batches")
        .insert({
          jobStatus: "pending",
          userId: recipient.userId,
          channel: "email",
          category,
          batchKind: batch.kind,
          batchKey,
          firstEventAt: nowIso,
          lastEventAt: nowIso,
          deliverAfter,
          maxDeliverAfter,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflict(
          trx.raw(
            '("userId", "channel", "batchKind", "batchKey") WHERE "closedAt" IS NULL',
          ),
        )
        .merge({
          lastEventAt: trx.raw('EXCLUDED."lastEventAt"'),
          deliverAfter: trx.raw(
            'LEAST("notification_batches"."maxDeliverAfter", EXCLUDED."deliverAfter")',
          ),
          updatedAt: trx.raw('EXCLUDED."updatedAt"'),
        })
        .returning("id");
      const batchId = rows[0]!.id;

      await trx("notification_batch_items")
        .insert({
          batchId,
          workflowRecipientId: recipient.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflict("workflowRecipientId")
        .ignore();

      // Early flush: once enough activity has accumulated, make the batch due
      // now so the next cron tick delivers it rather than waiting out the
      // remaining debounce window.
      const [counted] = await trx("notification_batch_items")
        .where({ batchId })
        .count({ count: "*" });
      if (Number(counted?.count ?? 0) >= batch.maxItems) {
        await trx("notification_batches")
          .where({ id: batchId })
          .update({ deliverAfter: nowIso, updatedAt: nowIso });
      }
    }
  });
}
