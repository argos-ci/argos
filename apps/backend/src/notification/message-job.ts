import { invariant } from "@argos/util/invariant";
import { SlackAPIError } from "@slack/web-api";

import { NotificationMessage, SlackInstallation } from "@/database/models/index.js"; // SlackInstallation might not be needed if Account relation is sufficient
import { sendEmail } from "@/email/send";
import { createModelJob } from "@/job-core/index.js";
import { handlers } from "@/notification/handlers/index.js";
import { boltApp } from "@/slack/index.js";
import config from "@/config/index.js"; // For server URL

export const notificationMessageJob = createModelJob(
  "notificationMessage",
  NotificationMessage,
  processMessage,
);

// Placeholder for React to plain text conversion
function reactToPlainText(reactElement: React.ReactElement): string {
  // In a real scenario, you'd use a library like react-dom/server an
  // then strip HTML tags or use a dedicated library for HTML to text.
  // For now, returning a placeholder.
  console.warn("reactToPlainText: Actual conversion not implemented, returning placeholder.", reactElement);
  return "[[ Email body content - React to plain text conversion needed ]]";
}

async function processMessage(message: NotificationMessage) {
  await message.$fetchGraph("[workflow, user.account.slackInstallation]");
  invariant(message.workflow, "workflow should be fetched");
  invariant(message.user, "user should be fetched");
  invariant(message.user.account, "user.account should be fetched");

  const handler = handlers[message.workflow.type];
  if (!handler) {
    console.error(`No notification handler found for type: ${message.workflow.type}`);
    // Optionally mark message as failed
    await message.$query().patch({ jobStatus: "error" });
    return;
  }

  const workflowData = message.workflow.data as any; // Cast to any to access dynamic properties
  const ctx = {
    user: {
      name: message.user.account.name
        ? extractFirstName(message.user.account.name)
        : null,
    },
  };

  if (message.channel === "email") {
    if (!message.user.email) {
      // User might have removed their email
      await message.$query().patch({ jobStatus: "error", error: "User has no email" });
      return;
    }
    const emailContent = handler.email({ ...workflowData, ctx });
    const result = await sendEmail({
      to: [message.user.email],
      subject: emailContent.subject,
      react: emailContent.body,
    });
    const externalId = result?.data?.id ?? null;
    await message
      .$query()
      .patch({ sentAt: new Date().toISOString(), externalId, jobStatus: "success" });

  } else if (message.channel === "slack") {
    const slackChannelId = message.data?.slackChannelId as string | undefined;
    const slackNotificationType = message.data?.slackNotificationType as string | undefined;

    if (!slackChannelId) {
      console.error("Slack notification: slackChannelId missing in message.data", { messageId: message.id });
      await message.$query().patch({ jobStatus: "error", error: "Missing slackChannelId" });
      return;
    }

    const slackInstallation = message.user.account.slackInstallation;
    if (!slackInstallation?.installation?.bot?.token) {
      console.error("Slack notification: Slack installation or bot token missing for account", { accountId: message.user.account.id });
      await message.$query().patch({ jobStatus: "error", error: "Slack installation/token missing" });
      return;
    }
    const botToken = slackInstallation.installation.bot.token;

    // Handle 'reference_changes' preference
    if (slackNotificationType === 'reference_changes') {
      // Assuming 'isReferenceBuild' or 'buildType' indicates if it's a reference build event.
      // This needs to be a convention from where NotificationWorkflow is created.
      const isReferenceEvent = workflowData.isReferenceBuild === true || workflowData.buildType === 'reference';
      if (!isReferenceEvent) {
        console.log(`Slack notification skipped: type is 'reference_changes' and event is not for a reference build.`, { messageId: message.id });
        // Mark as success as no action is needed. Or a specific status like 'skipped'.
        await message.$query().patch({ jobStatus: "success", sentAt: new Date().toISOString(), externalId: "skipped_not_reference_event" });
        return;
      }
    }

    const emailEquivalentContent = handler.email({ ...workflowData, ctx });
    const subject = emailEquivalentContent.subject;
    const plainTextBody = reactToPlainText(emailEquivalentContent.body);
    const viewDetailsUrl = workflowData.url ? `${config.get("server.url")}${workflowData.url}` : null;

    let slackText = `*${subject}*\n\n${plainTextBody}`;
    if (viewDetailsUrl) {
      slackText += `\n\n<${viewDetailsUrl}|View Details>`;
    }

    try {
      const slackResponse = await boltApp.client.chat.postMessage({
        token: botToken,
        channel: slackChannelId,
        text: subject, // Fallback for notifications
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: slackText,
            },
          },
        ],
      });

      const externalId = slackResponse.ts ?? null;
      await message
        .$query()
        .patch({ sentAt: new Date().toISOString(), externalId, jobStatus: "success" });

    } catch (error) {
      console.error("Error sending Slack notification:", error);
      let errorMessage = "Failed to send Slack message";
      if (error instanceof SlackAPIError) {
        errorMessage = `Slack API Error: ${error.code} - ${error.data?.error || error.message}`;
        // Specific error handling
        if (error.code === 'channel_not_found' || error.data?.error === 'channel_not_found' ||
            error.code === 'is_archived' || error.data?.error === 'is_archived') {
          // Consider deactivating future notifications to this channel or installation
          // For now, just mark as error
        } else if (error.data?.error === 'token_revoked' || error.data?.error === 'invalid_auth') {
          // Consider deactivating the SlackInstallation
        }
      }
      await message.$query().patch({ jobStatus: "error", error: errorMessage });
    }
  } else {
    console.warn(`Unsupported channel type: ${message.channel}`);
    await message.$query().patch({ jobStatus: "error", error: `Unsupported channel: ${message.channel}` });
  }
}

/**
 * Extract the first name from a full name.
 */
function extractFirstName(fullName: string): string | null {
  const parts = fullName.split(" ");
  return parts[0] || null;
}
