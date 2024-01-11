import config from "@/config/index.js";
import { WebhookClient } from "discord.js";

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
