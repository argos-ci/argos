import * as Sentry from "@sentry/node";
import { WebhookClient } from "discord.js";

import config from "@/config/index.js";

import { Account, Subscription } from "../database/models";

const webhookUrl = config.get("discord.webhookUrl");

const webhookClient = webhookUrl
  ? new WebhookClient({
      url: config.get("discord.webhookUrl"),
    })
  : null;

export async function notifyDiscord(input: { content: string }) {
  if (webhookClient) {
    await webhookClient.send({
      content: input.content,
    });
  }
}

export async function notifySubscriptionStatusUpdate(subscription: {
  provider: Subscription["provider"];
  accountId: string;
  status: Subscription["status"];
}) {
  const account = await Account.query()
    .findById(subscription.accountId)
    .throwIfNotFound();

  const message =
    subscription.status === "active"
      ? `🎉 New customer active`
      : subscription.status === "trialing"
        ? `🚀 New Trial`
        : `⚠️ Subscription status update "${subscription.status}" `;

  await notifyDiscord({
    content: `${subscription.provider} - ${message} for ${account.name || account.slug} (ID: ${account.id})`,
  }).catch((error) => {
    Sentry.captureException(error);
  });
}
