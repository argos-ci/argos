import { WebhookClient } from "discord.js";

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
      allowedMentions: { parse: [] },
    });
  }
}

/**
 * Build a Discord markdown link with its embed preview suppressed (the `<...>`
 * wrapper), so notification lines stay compact.
 */
export function formatDiscordLink(label: string, url: string): string {
  return `[${label}](<${url}>)`;
}

/**
 * URL of an account (team or user) in the app.
 */
export function getAccountUrl(slug: string): string {
  return new URL(`/${slug}`, config.get("server.url")).href;
}

/**
 * URL of a project in the app.
 */
export function getProjectUrl(
  accountSlug: string,
  projectName: string,
): string {
  return new URL(`/${accountSlug}/${projectName}`, config.get("server.url"))
    .href;
}
