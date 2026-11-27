import { NotificationMessage } from "@/database/models";
import { sendEmail } from "@/email/send";
import { createModelJob } from "@/job-core";
import {
  getNotificationSettingsUrl,
  isConfigurableNotificationCategory,
} from "@/notification/categories";
import { notificationHandlers } from "@/notification/handlers";

export const notificationMessageJob = createModelJob(
  "notificationMessage",
  NotificationMessage,
  processMessage,
);

async function processMessage(message: NotificationMessage) {
  if (message.channel !== "email") {
    throw new Error("Only email channel is supported");
  }

  const { workflow, user } = await message.$fetchGraph(
    "[workflow, user.account]",
  );

  // At this point, the user could have changed their email address.
  if (!user.email) {
    return;
  }

  const to = [user.email];
  const type = workflow.type;
  const handler = notificationHandlers.find((h) => h.type === type);
  if (!handler) {
    throw new Error(`Handler not found: ${type}`);
  }
  const data = workflow.data;

  // Configurable notifications link to the user's notification preferences so
  // they can manage what they receive.
  const preferencesUrl = isConfigurableNotificationCategory(handler.category)
    ? getNotificationSettingsUrl(user.account.slug)
    : null;

  const ctx = {
    user: {
      id: message.userId,
      name: user.account.name ? extractFirstName(user.account.name) : null,
    },
    preferencesUrl,
  };
  const email = handler.email({ ...(data as any), ctx });

  const result = await sendEmail({
    to,
    subject: email.subject,
    react: email.body,
    // A retry of the job does not send the message twice.
    idempotencyKey: `notification-message/${message.id}`,
  });

  const externalId = (await result?.data?.id) ?? null;

  // Mark the message as sent and store the external ID.
  await message
    .$query()
    .patch({ sentAt: new Date().toISOString(), externalId });
}

/**
 * Extract the first name from a full name.
 */
function extractFirstName(fullName: string): string | null {
  const parts = fullName.split(" ");
  return parts[0] || null;
}
