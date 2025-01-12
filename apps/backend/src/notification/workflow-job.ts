import { invariant } from "@argos/util/invariant";

import {
  NotificationMessage,
  NotificationWorkflow,
} from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

import { notificationMessageJob } from "./message-job";

export const notificationWorkflowJob = createModelJob(
  "notificationWorkflow",
  NotificationWorkflow,
  processWorkflow,
);

async function processWorkflow(workflow: NotificationWorkflow) {
  await workflow.$fetchGraph("recipients.user");
  invariant(workflow.recipients, "recipients must be fetched");

  const emailMessages = workflow.recipients
    .map((recipient) => {
      invariant(recipient.user, "user must be fetched");
      if (!recipient.user.email) {
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
