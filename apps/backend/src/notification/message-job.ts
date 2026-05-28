import { invariant } from "@argos/util/invariant";

import { NotificationMessage } from "@/database/models";
import { sendEmail } from "@/email/send";
import { createModelJob } from "@/job-core";
import { notificationHandlers } from "@/notification/handlers";
import { getUnsubscribeUrl } from "@/notification/unsubscribe";

export const notificationMessageJob = createModelJob(
  "notificationMessage",
  NotificationMessage,
  processMessage,
);

async function processMessage(message: NotificationMessage) {
  if (message.channel !== "email") {
    throw new Error("Only email channel is supported");
  }

  await message.$fetchGraph("[workflow, user.account]");
  invariant(message.workflow, "workflow should be fetched");
  invariant(message.user, "user should be fetched");
  invariant(message.user.account, "user.account should be fetched");

  // At this point, the user could have changed their email address.
  if (!message.user.email) {
    return;
  }

  const to = [message.user.email];
  const type = message.workflow.type;
  const handler = notificationHandlers.find((h) => h.type === type);
  if (!handler) {
    throw new Error(`Handler not found: ${type}`);
  }
  const data = message.workflow.data;

  // Configurable notifications carry a one-click unsubscribe link/header
  // (RFC 8058) scoped to the notification's category and channel.
  const headers: Record<string, string> = {};
  let unsubscribeUrl: string | null = null;
  if (handler.configurable) {
    unsubscribeUrl = getUnsubscribeUrl({
      userId: message.userId,
      category: handler.category,
      channel: "email",
    });
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const ctx = {
    user: {
      name: message.user.account.name
        ? extractFirstName(message.user.account.name)
        : null,
    },
    unsubscribeUrl,
  };
  const email = handler.email({ ...(data as any), ctx });

  const result = await sendEmail({
    to,
    subject: email.subject,
    react: email.body,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
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
