import { invariant } from "@argos/util/invariant";

import { NotificationMessage } from "@/database/models/index.js";
import { sendEmail } from "@/email/send";
import { createModelJob } from "@/job-core/index.js";
import { handlers } from "@/notification/handlers/index.js";

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
  const handler = handlers[message.workflow.type];
  const data = message.workflow.data;
  const ctx = {
    user: {
      name: message.user.account.name
        ? extractFirstName(message.user.account.name)
        : null,
    },
  };
  const email = handler.email({ ...(data as any), ctx });
  await sendEmail({
    to,
    subject: email.subject,
    react: email.body,
  });
}

/**
 * Extract the first name from a full name.
 */
function extractFirstName(fullName: string): string | null {
  const parts = fullName.split(" ");
  return parts[0] || null;
}
