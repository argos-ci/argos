import { createHash, type KeyObject } from "node:crypto";
import { z } from "zod";

import { getOriginSigningKeys } from "./jwks";
import { verifyEd25519 } from "./jwt";

/**
 * Origin webhook deliveries.
 *
 * Every delivery is signed with Origin's Ed25519 keys over
 * `sha256("<webhook-id>.<webhook-timestamp>.<raw-body>")`, hex-encoded. The
 * signature does not say which key signed, so every active key is tried.
 */

const MAX_CLOCK_SKEW = 5 * 60; // seconds

type WebhookHeaders = Record<string, string | string[] | undefined>;

function getHeader(headers: WebhookHeaders, name: string): string | null {
  const value = headers[name];
  if (typeof value === "string") {
    return value;
  }
  return null;
}

/**
 * Verify the signature of a webhook delivery against the raw request body.
 */
export async function verifyOriginWebhook(
  body: Buffer,
  headers: WebhookHeaders,
): Promise<boolean> {
  const keys = await getOriginSigningKeys();
  return verifyOriginWebhookSignature(
    body,
    headers,
    keys.map(({ key }) => key),
  );
}

/**
 * Same as {@link verifyOriginWebhook}, against the given signing keys.
 * Exported for testing.
 */
export function verifyOriginWebhookSignature(
  body: Buffer,
  headers: WebhookHeaders,
  keys: KeyObject[],
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  const id = getHeader(headers, "webhook-id");
  const rawTimestamp = getHeader(headers, "webhook-timestamp");
  const signatureHeader = getHeader(headers, "webhook-signature");
  if (!id || !rawTimestamp || !signatureHeader) {
    return false;
  }

  const timestamp = Number(rawTimestamp);
  if (
    !Number.isInteger(timestamp) ||
    Math.abs(now - timestamp) > MAX_CLOCK_SKEW
  ) {
    return false;
  }

  const signatures = signatureHeader
    .split(/\s+/)
    .filter((value) => value.startsWith("v1ed,"))
    .map((value) => Buffer.from(value.slice("v1ed,".length), "base64"));
  if (signatures.length === 0) {
    return false;
  }

  const digest = createHash("sha256")
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest("hex");
  const data = Buffer.from(digest);

  return keys.some((key) =>
    signatures.some((signature) => verifyEd25519(data, signature, key)),
  );
}

/**
 * The delivery envelope wrapping every event payload.
 */
export const OriginWebhookDeliverySchema = z.object({
  deliveryId: z.string(),
  appId: z.string().optional(),
  installationId: z.string().optional(),
  event: z.object({
    id: z.string().optional(),
    type: z.string(),
    eventTime: z.string().optional(),
    payload: z.unknown(),
  }),
});

export type OriginWebhookDelivery = z.infer<typeof OriginWebhookDeliverySchema>;
