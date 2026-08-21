import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyOriginWebhookSignature } from "./webhook";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const stranger = generateKeyPairSync("ed25519");

const NOW = 1_787_000_000;

function signDelivery(input: {
  id: string;
  timestamp: number;
  body: Buffer;
  key?: typeof privateKey;
}) {
  const digest = createHash("sha256")
    .update(`${input.id}.${input.timestamp}.`)
    .update(input.body)
    .digest("hex");
  const signature = sign(null, Buffer.from(digest), input.key ?? privateKey);
  return `v1ed,${signature.toString("base64")}`;
}

describe("verifyOriginWebhookSignature", () => {
  const body = Buffer.from(JSON.stringify({ deliveryId: "whd_1" }));
  const headers = {
    "webhook-id": "whd_1",
    "webhook-timestamp": String(NOW),
    "webhook-signature": signDelivery({ id: "whd_1", timestamp: NOW, body }),
  };

  it("accepts a delivery signed by an active key", () => {
    expect(verifyOriginWebhookSignature(body, headers, [publicKey], NOW)).toBe(
      true,
    );
  });

  it("tries every active key, the signature does not name one", () => {
    expect(
      verifyOriginWebhookSignature(
        body,
        headers,
        [stranger.publicKey, publicKey],
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects a signature from an unknown key", () => {
    expect(
      verifyOriginWebhookSignature(body, headers, [stranger.publicKey], NOW),
    ).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyOriginWebhookSignature(
        Buffer.from(JSON.stringify({ deliveryId: "whd_2" })),
        headers,
        [publicKey],
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects a delivery whose timestamp drifted more than five minutes", () => {
    expect(
      verifyOriginWebhookSignature(body, headers, [publicKey], NOW + 301),
    ).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(
      verifyOriginWebhookSignature(
        body,
        { "webhook-id": "whd_1" },
        [publicKey],
        NOW,
      ),
    ).toBe(false);
  });

  it("ignores signature versions it does not know", () => {
    expect(
      verifyOriginWebhookSignature(
        body,
        { ...headers, "webhook-signature": "v2,abcd" },
        [publicKey],
        NOW,
      ),
    ).toBe(false);
  });
});
