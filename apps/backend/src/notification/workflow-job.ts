import { invariant } from "@argos/util/invariant";

import {
  NotificationMessage,
  NotificationWorkflow,
  UserNotificationPreference,
} from "@/database/models";
import { createModelJob } from "@/job-core";

import { isConfigurableNotificationCategory } from "./categories";
import { notificationHandlers } from "./handlers";
import { notificationMessageJob } from "./message-job";

export const notificationWorkflowJob = createModelJob(
  "notificationWorkflow",
  NotificationWorkflow,
  processWorkflow,
);

async function processWorkflow(workflow: NotificationWorkflow) {
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

  const emailMessages = workflow.recipients
    .map((recipient) => {
      invariant(recipient.user, "user must be fetched");
      if (!recipient.user.email) {
        return null;
      }
      if (optedOutUserIds.has(recipient.userId)) {
        return null;
      }
      return {
        userId: recipient.userId,
        workflowId: workflow.id,
        channel: "email" as const,
        jobStatus: "pending" as const,
      };
    })
    .filter((message) => message !== null);

  if (emailMessages.length === 0) {
    return;
  }

  const messages = await NotificationMessage.query()
    .insert(emailMessages)
    .returning("id");

  await notificationMessageJob.push(...messages.map((message) => message.id));
}
