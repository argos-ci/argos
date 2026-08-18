import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import config from "@/config";

import { verifyInstallationReceiptWithKeys } from "./receipt";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const KEYS = [{ kid: "origin-key-1", key: publicKey }];

const NOW = 1_787_000_000;
const APP_ID = "app_test";
const ISSUER = "https://api.cursor.com/v1/origin";

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeReceipt(input: {
  header?: Record<string, unknown>;
  claims?: Record<string, unknown>;
  key?: typeof privateKey;
}) {
  const header = encode({
    alg: "EdDSA",
    kid: "origin-key-1",
    typ: "origin-installation-receipt+jwt",
    ...input.header,
  });
  const claims = encode({
    iss: ISSUER,
    aud: APP_ID,
    sub: "i_01",
    namespace_id: "ns_01",
    iat: NOW,
    exp: NOW + 300,
    jti: "receipt-1",
    state: "signed-state",
    ...input.claims,
  });
  const signature = sign(
    null,
    Buffer.from(`${header}.${claims}`),
    input.key ?? privateKey,
  ).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

describe("verifyInstallationReceiptWithKeys", () => {
  const originalAppId = config.get("origin.appId");

  beforeEach(() => {
    config.set("origin.appId", APP_ID);
  });

  afterEach(() => {
    config.set("origin.appId", originalAppId);
  });

  it("reads the installation and state from a valid receipt", () => {
    expect(
      verifyInstallationReceiptWithKeys(makeReceipt({}), KEYS, NOW),
    ).toEqual({
      installationId: "i_01",
      namespaceId: "ns_01",
      state: "signed-state",
    });
  });

  it("rejects an expired receipt", () => {
    expect(
      verifyInstallationReceiptWithKeys(makeReceipt({}), KEYS, NOW + 301),
    ).toBeNull();
  });

  it("rejects a receipt for another app", () => {
    expect(
      verifyInstallationReceiptWithKeys(
        makeReceipt({ claims: { aud: "app_other" } }),
        KEYS,
        NOW,
      ),
    ).toBeNull();
  });

  it("rejects a receipt signed by an unknown key", () => {
    const stranger = generateKeyPairSync("ed25519");
    expect(
      verifyInstallationReceiptWithKeys(
        makeReceipt({ key: stranger.privateKey }),
        KEYS,
        NOW,
      ),
    ).toBeNull();
  });

  it("rejects a token that is not a receipt", () => {
    expect(
      verifyInstallationReceiptWithKeys(
        makeReceipt({ header: { typ: "JWT" } }),
        KEYS,
        NOW,
      ),
    ).toBeNull();
    expect(
      verifyInstallationReceiptWithKeys("not.a.jwt", KEYS, NOW),
    ).toBeNull();
  });
});
