import type { MsTeamsWebhook } from "@/database/models";
import { boom } from "@/util/error";

import { buildCardMessage, type AdaptiveCard } from "./card";

/**
 * Hosts allowed as Microsoft Teams webhook targets.
 *
 * This is a security boundary, not a convenience check: the URL is supplied by
 * the user and posted to by our servers, so an open target would turn the
 * feature into an SSRF primitive. Only Microsoft-operated endpoints are
 * accepted.
 *
 * - `api.powerplatform.com` — what the Teams "Workflows" templates hand out
 *   today, e.g.
 *   `https://default<tenant>.<region>.environment.api.powerplatform.com/powerautomate/automations/direct/...`
 *   Verified against a real tenant on 2026-07-24.
 * - `logic.azure.com` — Power Automate flows created outside Teams, and older
 *   Workflows URLs still in circulation.
 * - `webhook.office.com` — legacy Microsoft 365 connectors, retired by
 *   Microsoft but still live for some tenants.
 */
const ALLOWED_WEBHOOK_HOST_SUFFIXES = [
  ".api.powerplatform.com",
  ".logic.azure.com",
  ".webhook.office.com",
];

/**
 * Validate and normalize a Microsoft Teams webhook URL.
 * Throws a user-facing error when the URL cannot be used.
 */
export function parseMsTeamsWebhookUrl(input: string): string {
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

  const hostname = url.hostname.toLowerCase();
  const allowed = ALLOWED_WEBHOOK_HOST_SUFFIXES.some((suffix) =>
    hostname.endsWith(suffix),
  );

  if (!allowed) {
    throw boom(
      400,
      "This does not look like a Microsoft Teams webhook URL. Expected a URL from powerplatform.com (Workflows), logic.azure.com or webhook.office.com.",
    );
  }

  return url.toString();
}

/**
 * Post an Adaptive Card to a Microsoft Teams webhook.
 */
export async function postCardToMsTeamsWebhook(args: {
  webhook: MsTeamsWebhook;
  card: AdaptiveCard;
}): Promise<void> {
  const { webhook, card } = args;
  await postCardToUrl({ url: webhook.url, card });
}

/**
 * Post an Adaptive Card to a raw webhook URL.
 *
 * Used both by the automation action and when testing a webhook before it is
 * persisted.
 */
export async function postCardToUrl(args: {
  url: string;
  card: AdaptiveCard;
}): Promise<void> {
  const { url, card } = args;

  const response = await fetch(parseMsTeamsWebhookUrl(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCardMessage(card)),
    // Workflows occasionally hangs; don't let a job block on it forever.
    signal: AbortSignal.timeout(15_000),
  });

  if (response.ok) {
    return;
  }

  // The body carries the actual reason (expired signature, deleted flow…).
  const body = await response.text().catch(() => "");
  const detail = body.slice(0, 500);

  // 401/403 mean the flow signature is no longer valid: retrying won't help.
  const retryable = response.status !== 401 && response.status !== 403;

  throw boom(
    502,
    `Microsoft Teams rejected the message (HTTP ${response.status})${
      detail ? `: ${detail}` : ""
    }`,
    { retryable },
  );
}
