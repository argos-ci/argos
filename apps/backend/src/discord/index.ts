import { WebhookClient } from "discord";

import config from "@/config";

const webhookUrl = config.get("discord.webhookUrl");

const webhookClient = webhookUrl
  ? new WebhookClient({
      url: config.get("discord.webhookUrl"),
    })
  : null;

/**
 * Notify a Discord channel via webhook.
 */
export async function notifyDiscord(input: { content: string }) {
  if (webhookClient) {
    await webhookClient.send({
      content: input.content,
    });
  }
}
