import config from "@/config";

const webhookUrl = config.get("discord.webhookUrl");

/**
 * Notify a Discord channel via webhook.
 *
 * Posted with `fetch` rather than through a Discord client library: executing a
 * webhook is a single unauthenticated POST, and the library's transport is what
 * made this fragile — it wraps every response in `new Headers(res.headers)`,
 * which throws as soon as undici negotiates HTTP/2, because node:http2 stamps
 * incoming header objects with a `sensitiveHeaders` symbol that cannot be
 * converted to a header name.
 */
export async function notifyDiscord(input: { content: string }) {
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: input.content,
      // These notifications quote names and emails users chose, so a message
      // must never be able to ping the channel.
      allowed_mentions: { parse: [] },
    }),
    // Don't let a caller block on Discord being slow.
    signal: AbortSignal.timeout(15_000),
  });

  // A successful execute-webhook call answers 204 with no body.
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body.slice(0, 500);
    throw new Error(
      `Discord rejected the notification (HTTP ${response.status})${
        detail ? `: ${detail}` : ""
      }`,
    );
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
