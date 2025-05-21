import { invariant } from "@argos/util/invariant";

import {
  NotificationMessage,
  NotificationWorkflow,
  ProjectSlackNotificationSetting, // Import ProjectSlackNotificationSetting
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

  const allMessagesToInsertData: Array<Partial<NotificationMessage>> = [];

  // Prepare Email Messages
  workflow.recipients.forEach((recipient) => {
    invariant(recipient.user, "user must be fetched");
    if (recipient.user.email) {
      allMessagesToInsertData.push({
        userId: recipient.userId,
        workflowId: workflow.id,
        channel: "email",
        jobStatus: "pending",
      });
    }
  });

  // Prepare Slack Messages
  // Assuming workflow.data contains necessary information like projectId
  // And that workflow.data.messageData contains title, body for Slack if needed
  // For now, title/body are handled by the message-job, not here.
  const projectId = workflow.data?.projectId as string | undefined;

  if (projectId) {
    const slackSettings = await ProjectSlackNotificationSetting.query().where({
      projectId,
    });

    if (slackSettings.length > 0) {
      slackSettings.forEach((setting) => {
        // Create one Slack message per channel, associated with each recipient
        // to maintain a link to who initiated or is related to the event.
        // The actual delivery in message-job will use setting.channelId.
        workflow.recipients.forEach((recipient) => {
          allMessagesToInsertData.push({
            userId: recipient.userId, // Retain association with the user
            workflowId: workflow.id,
            channel: "slack",
            jobStatus: "pending",
            data: {
              slackChannelId: setting.channelId,
              slackNotificationType: setting.notificationType,
              // If title/body/messageData were to be added here:
              // title: workflow.data.messageData?.title as string || "Notification",
              // body: workflow.data.messageData?.body as string || "",
              // ...(workflow.data.messageData || {}),
            },
          });
        });
      });
    }
  }

  if (allMessagesToInsertData.length === 0) {
    return;
  }

  const insertedMessages = await NotificationMessage.query()
    .insert(allMessagesToInsertData)
    .returning("id");

  if (insertedMessages.length > 0) {
    await notificationMessageJob.push(
      ...insertedMessages.map((message) => message.id),
    );
  }
}
