import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch } from "undici";

import { checkIsPublicAddress, parseWebhookUrl } from "./url";

const TIMEOUT_MS = 10_000;

export class NonPublicAddressError extends Error {}

/**
 * Resolve a hostname, refusing it when any of its addresses is not public.
 *
 * Checked at connection time rather than before the request: a name resolved
 * twice can answer differently the second time (DNS rebinding), so the
 * address that is checked has to be the one the socket connects to.
 */
export const lookupPublicAddress: LookupFunction = (
  hostname,
  options,
  callback,
) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) {
      callback(error, options.all ? [] : "");
      return;
    }
    const [first] = addresses;
    if (
      !first ||
      !addresses.every(({ address }) => checkIsPublicAddress(address))
    ) {
      callback(
        new NonPublicAddressError(
          `${hostname} resolves to a non-public address`,
        ),
        options.all ? [] : "",
      );
      return;
    }
    if (options.all) {
      callback(null, addresses);
    } else {
      callback(null, first.address, first.family);
    }
  });
};

const publicAgent = new Agent({ connect: { lookup: lookupPublicAddress } });

const privateNetworkAgent = new Agent();

const SECRET_PREFIX = "whsec_";

/**
 * A new signing secret, in the Standard Webhooks format: `whsec_` followed by
 * the base64 of the key bytes.
 */
export function generateWebhookSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(32).toString("base64")}`;
}

/**
 * The `webhook-signature` header of a message, per Standard Webhooks
 * (https://www.standardwebhooks.com): the base64 HMAC-SHA256 of
 * `{id}.{timestamp}.{body}`, keyed with the bytes the secret encodes.
 */
function signWebhookMessage(args: {
  id: string;
  timestamp: number;
  body: string;
  secret: string;
}): string {
  const key = Buffer.from(args.secret.slice(SECRET_PREFIX.length), "base64");
  const signature = createHmac("sha256", key)
    .update(`${args.id}.${args.timestamp}.${args.body}`)
    .digest("base64");
  return `v1,${signature}`;
}

export type WebhookRequestResult =
  | { ok: true; status: number }
  | {
      ok: false;
      status: number | null;
      reason: string;
      /** Whether another attempt could succeed without anyone acting. */
      retryable: boolean;
    };

function describeRequestError(error: unknown): {
  reason: string;
  retryable: boolean;
} {
  if (error instanceof Error && error.name === "TimeoutError") {
    return {
      reason: `Your endpoint did not respond within ${TIMEOUT_MS / 1000} seconds.`,
      retryable: true,
    };
  }
  const cause = error instanceof Error ? error.cause : null;
  if (cause instanceof NonPublicAddressError) {
    return {
      reason: "The URL resolves to a private address.",
      retryable: false,
    };
  }
  if (cause instanceof Error && "code" in cause) {
    if (cause.code === "ENOTFOUND") {
      return { reason: "The domain name does not resolve.", retryable: true };
    }
    if (cause.code === "ECONNREFUSED") {
      return {
        reason: "Your endpoint refused the connection.",
        retryable: true,
      };
    }
    return {
      reason: `The request failed (${String(cause.code)}).`,
      retryable: true,
    };
  }
  return { reason: "The request failed.", retryable: true };
}

/**
 * Post an event to a webhook. Never throws for a failure of the endpoint: the
 * result says what went wrong, to record it on the delivery.
 */
export async function postWebhookRequest(args: {
  url: string;
  secret: string;
  /** Identifies the message to the endpoint, the same on every attempt. */
  messageId: string;
  body: string;
  allowPrivateNetwork: boolean;
}): Promise<WebhookRequestResult> {
  const { secret, messageId, body, allowPrivateNetwork } = args;

  let url: string;
  try {
    // Checked again on every attempt: the stored URL predates any rule added
    // since.
    url = parseWebhookUrl(args.url, { allowPrivateNetwork });
  } catch (error) {
    return {
      ok: false,
      status: null,
      reason: error instanceof Error ? error.message : "Invalid URL.",
      retryable: false,
    };
  }

  // Signed anew on every attempt: endpoints refuse a stale timestamp.
  const timestamp = Math.floor(Date.now() / 1000);
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Argos-Webhooks",
        "webhook-id": messageId,
        "webhook-timestamp": String(timestamp),
        "webhook-signature": signWebhookMessage({
          id: messageId,
          timestamp,
          body,
          secret,
        }),
      },
      body,
      // A redirect would send the request to a host nobody validated.
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      dispatcher: allowPrivateNetwork ? privateNetworkAgent : publicAgent,
    });
  } catch (error) {
    return { ok: false, status: null, ...describeRequestError(error) };
  }

  // Nothing in the response is used; release the connection.
  await response.body?.cancel().catch(() => undefined);

  if (response.status >= 200 && response.status < 300) {
    return { ok: true, status: response.status };
  }

  if (response.status >= 300 && response.status < 400) {
    return {
      ok: false,
      status: response.status,
      reason: `Your endpoint redirected with HTTP ${response.status}. Argos does not follow redirects: use the final URL.`,
      retryable: false,
    };
  }

  return {
    ok: false,
    status: response.status,
    reason: `Your endpoint responded with HTTP ${response.status}.`,
    retryable: true,
  };
}
