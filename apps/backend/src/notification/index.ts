import { transaction } from "@/database";
import {
  NotificationWorkflow,
  NotificationWorkflowData,
  NotificationWorkflowRecipient,
  NotificationWorkflowType,
} from "@/database/models";

import { notificationWorkflowJob } from "./workflow-job";

/**
 * Send a notification to a list of recipients.
 */
export async function sendNotification<
  Type extends NotificationWorkflowType,
>(input: {
  /**
   * Type of the notification.
   */
  type: Type;
  /**
   * Data for the notification.
   */
  data: NotificationWorkflowData[Type];
  /**
   * User IDs to send the notification to.
   */
  recipients: string[];
}) {
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
