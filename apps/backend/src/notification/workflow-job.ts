import { invariant } from "@argos/util/invariant";

import config from "@/config";
import {
  NotificationMessage,
  NotificationWorkflow,
  UserNotificationPreference,
} from "@/database/models";
import { createModelJob } from "@/job-core";

import { enqueueWorkflowForBatching } from "./batch";
import { isConfigurableNotificationCategory } from "./categories";
import { notificationHandlers } from "./handlers";
import { notificationMessageJob } from "./message-job";

export const notificationWorkflowJob = createModelJob(
  "notificationWorkflow",
  NotificationWorkflow,
  processWorkflow,
);

export async function processWorkflow(workflow: NotificationWorkflow) {
  await workflow.$fetchGraph("recipients.user");
  invariant(workflow.recipients, "recipients must be fetched");

  const handler = notificationHandlers.find((h) => h.type === workflow.type);
  invariant(handler, `Notification handler not found: ${workflow.type}`);

  // Configurable notifications can be muted by the recipient. We collect the
  // users who opted out of this category on the email channel and skip them.
  // Non-configurable notifications (transactional/security) are always sent.
  const optedOutUserIds = isConfigurableNotificationCategory(handler.category)
    ? new Set(
        (
          await UserNotificationPreference.query()
            .select("userId")
            .where({
              category: handler.category,
              channel: "email",
              enabled: false,
            })
            .whereIn(
              "userId",
              workflow.recipients.map((recipient) => recipient.userId),
            )
        ).map((preference) => preference.userId),
      )
    : new Set<string>();

  // Recipients with an email who haven't opted out of this category.
  const eligibleRecipients = workflow.recipients.filter((recipient) => {
    invariant(recipient.user, "user must be fetched");
    if (!recipient.user.email) {
      return false;
    }
    if (optedOutUserIds.has(recipient.userId)) {
      return false;
    }
    return true;
  });

  if (eligibleRecipients.length === 0) {
    return;
  }

  // Batchable workflows accumulate into a digest instead of sending one email
  // per event. Guarded by a config flag; workflows without a batchKey (and all
  // non-batchable handlers) always send immediately, so this stays
  // backward-compatible.
  const shouldBatch =
    config.get("notifications.reviewBatching.enabled") &&
    Boolean(handler.batch) &&
    Boolean(workflow.batchKey);

  if (shouldBatch && handler.batch) {
    await enqueueWorkflowForBatching({
      workflow,
      batch: handler.batch,
      category: handler.category,
      recipients: eligibleRecipients.map((recipient) => ({
        id: recipient.id,
        userId: recipient.userId,
      })),
    });
    return;
  }

  const messages = await NotificationMessage.query()
    .insert(
      eligibleRecipients.map((recipient) => ({
        userId: recipient.userId,
        workflowId: workflow.id,
        channel: "email" as const,
        jobStatus: "pending" as const,
      })),
    )
    .returning("id");

  await notificationMessageJob.push(...messages.map((message) => message.id));
}
