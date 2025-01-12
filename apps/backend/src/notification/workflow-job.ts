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
  const recipients = await workflow.$relatedQuery("recipients");
  const messages = await NotificationMessage.query()
    .insert(
      recipients.map((recipient) => ({
        userId: recipient.userId,
        workflowId: workflow.id,
        channel: "email" as const,
        jobStatus: "pending" as const,
      })),
    )
    .returning("id");

  notificationMessageJob.push(...messages.map((message) => message.id));
}
