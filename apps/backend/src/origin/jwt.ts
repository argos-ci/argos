import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  type KeyObject,
  type webcrypto,
} from "node:crypto";
import { memoize } from "lodash-es";
import { z } from "zod";

import config from "@/config";

/**
 * Compact JWTs signed with Ed25519 (`alg: EdDSA`), which is what Origin uses
 * for app authentication, installation receipts and webhook keys.
 *
 * `jsonwebtoken` does not support EdDSA, and this is the only place Argos needs
 * it, so the few lines of JOSE involved are written out here on top of
 * `node:crypto` rather than pulling a new dependency.
 */

const APP_JWT_LIFETIME = 5 * 60; // 5 minutes, what Origin recommends

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function encodeJson(value: unknown): string {
  return base64url(JSON.stringify(value));
}

const getAppPrivateKey = memoize(() =>
  createPrivateKey(config.get("origin.privateKey")),
);

/**
 * Sign a short-lived JWT proving we are the Origin app. It is what mints
 * installation tokens and reads app-level resources.
 */
export function signAppJwt(): string {
  const appId = config.get("origin.appId");
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "EdDSA", kid: appId, typ: "JWT" });
  const payload = encodeJson({
    iss: appId,
    aud: "origin-apps",
    iat: now,
    exp: now + APP_JWT_LIFETIME,
  });
  const signature = sign(
    null,
    Buffer.from(`${header}.${payload}`),
    getAppPrivateKey(),
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

const JoseHeaderSchema = z.object({
  alg: z.string(),
  kid: z.string().optional(),
  typ: z.string().optional(),
});

export type JoseHeader = z.infer<typeof JoseHeaderSchema>;

function decodeJson(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

/**
 * Split a compact JWT without verifying it, to read the header (`kid`) that
 * says which key verifies it.
 */
export function decodeJwt(token: string): {
  header: JoseHeader;
  payload: unknown;
  signingInput: Buffer;
  signature: Buffer;
} | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [rawHeader, rawPayload, rawSignature] = parts as [
    string,
    string,
    string,
  ];
  try {
    const header = JoseHeaderSchema.parse(decodeJson(rawHeader));
    const payload = decodeJson(rawPayload);
    return {
      header,
      payload,
      signingInput: Buffer.from(`${rawHeader}.${rawPayload}`),
      signature: Buffer.from(rawSignature, "base64url"),
    };
  } catch {
    return null;
  }
}

/**
 * Verify an EdDSA signature against a public key. Returns `false` on any
 * failure, including a malformed key: a bad key must read as "not verified",
 * never crash the request.
 */
export function verifyEd25519(
  data: Buffer,
  signature: Buffer,
  publicKey: KeyObject,
): boolean {
  try {
    return verify(null, data, publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Build a public key from an Ed25519 JWK (`kty: OKP`, `crv: Ed25519`).
 */
export function publicKeyFromJwk(jwk: webcrypto.JsonWebKey): KeyObject {
  return createPublicKey({ key: jwk, format: "jwk" });
}
