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
 *
 * When `batchKey` is set and the handler opts into batching, the workflow job
 * rolls the event into a debounced digest instead of sending immediately.
 * Returns the created workflow.
 */
export async function sendNotification<Type extends NotificationWorkflowType>(
  input: NotificationWorkflowProps<Type> & {
    /**
     * User IDs to send the notification to.
     */
    recipients: string[];
    /**
     * Scope key (e.g. `build:42`) opting the notification into batching. Only
     * has an effect when the handler defines `batch` metadata.
     */
    batchKey?: string;
  },
): Promise<NotificationWorkflow> {
  if (input.recipients.length === 0) {
    throw new Error("No recipients provided");
  }
  const workflow = await transaction(async (trx) => {
    const workflow = await NotificationWorkflow.query(trx).insertAndFetch({
      type: input.type,
      data: input.data,
      jobStatus: "pending",
      batchKey: input.batchKey ?? null,
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
  return workflow;
}
