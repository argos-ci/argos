import { transaction } from "@/database";
import {
  NotificationWorkflow,
  NotificationWorkflowRecipient,
} from "@/database/models";

import type {
  NotificationWorkflowProps,
  NotificationWorkflowType,
} from "./handlers";
import { notificationWorkflowJob } from "./workflow-job";

/**
 * Send a notification to a list of recipients.
 */
export async function sendNotification<Type extends NotificationWorkflowType>(
  input: NotificationWorkflowProps<Type> & {
    /**
     * User IDs to send the notification to.
     */
    recipients: string[];
  },
) {
  if (input.recipients.length === 0) {
    throw new Error("No recipients provided");
  }
  const workflow = await transaction(async (trx) => {
    const workflow = await NotificationWorkflow.query(trx).insertAndFetch({
      type: input.type,
      data: input.data,
      jobStatus: "pending",
    });
    await NotificationWorkflowRecipient.query(trx).insert(
      input.recipients.map((recipient) => ({
        workflowId: workflow.id,
        userId: recipient,
      })),
    );
    return workflow;
  });
  await notificationWorkflowJob.push(workflow.id);
}
