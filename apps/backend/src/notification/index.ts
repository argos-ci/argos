import { transaction } from "@/database/index.js";
import {
  NotificationWorkflow,
  NotificationWorkflowData,
  NotificationWorkflowRecipient,
} from "@/database/models/index.js";

import { notificationWorkflowJob } from "./workflow-job.js";
import { NotificationWorkflowType } from "./workflow-types.js";

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
