import { WebhookClient } from "discord.js";

import config from "@/config";

/**
 * Discord channels Argos posts to.
 *
 * - `head`: low-volume events worth an interruption, in a channel also used to
 *   talk to people — subscription changes, trial extensions.
 * - `growth`: high-volume activity feed meant to be muted and read on demand —
 *   project creations, daily report.
 *
 * The channel is explicit at every call site: defaulting to `head` would make
 * it too easy to flood the channel nobody can mute.
 */
export type DiscordChannel = "head" | "growth";

function createWebhookClient(url: string) {
  return url ? new WebhookClient({ url }) : null;
}

const webhookClients: Record<DiscordChannel, WebhookClient | null> = {
  head: createWebhookClient(config.get("discord.headWebhookUrl")),
  growth: createWebhookClient(config.get("discord.growthWebhookUrl")),
};

/**
 * Notify a Discord channel via webhook. Unconfigured channels are a no-op, so
 * a missing webhook URL never breaks the caller.
 */
export async function notifyDiscord(input: {
  content: string;
  channel: DiscordChannel;
}) {
  const webhookClient = webhookClients[input.channel];
  if (webhookClient) {
    await webhookClient.send({
      content: input.content,
      allowedMentions: { parse: [] },
    });
  }
}
