/**
 * Customer-facing Discord integration: one webhook per channel, registered by
 * an account.
 *
 * Distinct from `./index.ts`, which posts Argos' own ops notifications to a
 * single webhook we configure ourselves. The URLs here are user-supplied, which
 * is why they are validated rather than handed straight to a client.
 */

import type { DiscordWebhook } from "@/database/models";
import { boom } from "@/util/error";

import { buildWebhookMessage, type DiscordEmbed } from "./embed";

/**
 * Hosts allowed as Discord webhook targets.
 *
 * This is a security boundary, not a convenience check: the URL is supplied by
 * the user and posted to by our servers, so an open target would turn the
 * feature into an SSRF primitive. Unlike Teams, Discord serves every tenant
 * from the same handful of hosts, so these are matched exactly rather than by
 * suffix — no subdomain is ever legitimate.
 *
 * - `discord.com` — what the "Copy Webhook URL" button hands out today.
 * - `discordapp.com` — the pre-2020 domain, still accepted by Discord and
 *   still pasted from old integrations.
 * - `canary.discord.com` / `ptb.discord.com` — the release channels; users on
 *   those builds copy URLs carrying their own host.
 */
const ALLOWED_WEBHOOK_HOSTS = [
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
];

/**
 * `/api/webhooks/<id>/<token>`, optionally version-pinned as `/api/v10/…`.
 *
 * Pinning the shape does more than reject typos: it is what lets us locate the
 * token — the whole credential — in order to obfuscate it. The first group
 * captures everything up to the id, so a replacement can keep it verbatim.
 */
const WEBHOOK_PATH_REGEX = /^(\/api(?:\/v\d+)?\/webhooks\/\d+)\/[^/]+\/?$/;

const EXPECTED_URL_MESSAGE =
  "This does not look like a Discord webhook URL. Expected a URL from the channel's Integrations settings, like https://discord.com/api/webhooks/…";

/**
 * Validate and normalize a Discord webhook URL.
 * Throws a user-facing error when the URL cannot be used.
 */
export function parseDiscordWebhookUrl(input: string): string {
  const trimmed = input.trim();

  const url = (() => {
    try {
      return new URL(trimmed);
    } catch {
      throw boom(400, "This is not a valid URL.");
    }
  })();

  if (url.protocol !== "https:") {
    throw boom(400, "The webhook URL must use HTTPS.");
  }

  if (!ALLOWED_WEBHOOK_HOSTS.includes(url.hostname.toLowerCase())) {
    throw boom(400, EXPECTED_URL_MESSAGE);
  }

  if (!WEBHOOK_PATH_REGEX.test(url.pathname)) {
    throw boom(400, EXPECTED_URL_MESSAGE);
  }

  // A pasted trailing slash is harmless but would make two rows for the same
  // webhook look different; drop it so the stored URL is canonical.
  if (url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

const OBFUSCATED = "***";

/**
 * Hide the credential part of a Discord webhook URL, keeping enough of it to
 * tell which webhook it points to.
 *
 * Anyone holding the whole URL can post to the channel, so this is the form to
 * show to users who are not allowed to use it. The id is kept — it is public
 * and distinguishes two webhooks — and the token, which is what authorizes the
 * call, is dropped.
 */
export function obfuscateDiscordWebhookUrl(input: string): string {
  const url = new URL(input);

  url.pathname = url.pathname.replace(WEBHOOK_PATH_REGEX, `$1/${OBFUSCATED}`);

  return url.toString();
}

/**
 * Post an embed to a Discord webhook.
 */
export async function postEmbedToDiscordWebhook(args: {
  webhook: DiscordWebhook;
  embed: DiscordEmbed;
}): Promise<void> {
  const { webhook, embed } = args;
  await postEmbedToUrl({ url: webhook.url, embed });
}

/**
 * Post an embed to a raw webhook URL.
 *
 * Used both by the automation action and when testing a webhook before it is
 * persisted.
 */
export async function postEmbedToUrl(args: {
  url: string;
  embed: DiscordEmbed;
}): Promise<void> {
  const { url, embed } = args;

  const response = await fetch(parseDiscordWebhookUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWebhookMessage(embed)),
    // Don't let a job block on Discord being slow.
    signal: AbortSignal.timeout(15_000),
  });

  // A successful execute-webhook call answers 204 with no body.
  if (response.ok) {
    return;
  }

  // The body carries the actual reason as JSON, e.g.
  // `{"message": "Unknown Webhook", "code": 10015}`.
  const body = await response.text().catch(() => "");
  const detail = body.slice(0, 500);

  // A client error means the webhook itself is wrong — deleted webhook, revoked
  // token, malformed embed — so the user has to fix it and retrying won't help.
  // Report it as a 400 to keep it out of Sentry. Throttling (429) is ours to
  // wait out.
  const isWebhookAtFault =
    response.status >= 400 && response.status < 500 && response.status !== 429;

  throw boom(
    isWebhookAtFault ? 400 : 502,
    `Discord rejected the message (HTTP ${response.status})${
      detail ? `: ${detail}` : ""
    }`,
    { retryable: !isWebhookAtFault },
  );
}
