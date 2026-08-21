import type { KeyObject } from "node:crypto";
import { z } from "zod";

import config from "@/config";

import { getOriginSigningKeys } from "./jwks";
import { decodeJwt, verifyEd25519 } from "./jwt";

/**
 * The installation receipt Origin appends to the install callback: a
 * short-lived JWT it signs, proving the approval came from Origin rather than a
 * forged redirect. `sub` is the installation ID, `state` echoes what we put in
 * the install URL.
 */

const RECEIPT_TYP = "origin-installation-receipt+jwt";

const ReceiptClaimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  sub: z.string(),
  namespace_id: z.string().optional(),
  exp: z.number(),
  iat: z.number().optional(),
  jti: z.string().optional(),
  state: z.string().optional(),
});

export type InstallationReceipt = {
  installationId: string;
  namespaceId: string | null;
  state: string | null;
};

/**
 * Verify an installation receipt. Returns `null` when anything is off — a
 * callback that fails verification must be rejected, never partially trusted.
 */
export async function verifyInstallationReceipt(
  token: string,
): Promise<InstallationReceipt | null> {
  return verifyInstallationReceiptWithKeys(token, await getOriginSigningKeys());
}

/**
 * Same as {@link verifyInstallationReceipt}, against the given signing keys.
 * Exported for testing.
 */
export function verifyInstallationReceiptWithKeys(
  token: string,
  keys: { kid: string; key: KeyObject }[],
  now: number = Math.floor(Date.now() / 1000),
): InstallationReceipt | null {
  const decoded = decodeJwt(token);
  if (!decoded) {
    return null;
  }

  const { header, payload, signingInput, signature } = decoded;
  if (header.alg !== "EdDSA" || header.typ !== RECEIPT_TYP || !header.kid) {
    return null;
  }

  const claims = ReceiptClaimsSchema.safeParse(payload);
  if (!claims.success) {
    return null;
  }

  if (
    claims.data.iss !== config.get("origin.issuer") ||
    claims.data.aud !== config.get("origin.appId") ||
    claims.data.exp <= now
  ) {
    return null;
  }

  const key = keys.find((k) => k.kid === header.kid);
  if (!key || !verifyEd25519(signingInput, signature, key.key)) {
    return null;
  }

  return {
    installationId: claims.data.sub,
    namespaceId: claims.data.namespace_id ?? null,
    state: claims.data.state ?? null,
  };
}
