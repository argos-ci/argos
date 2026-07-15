import { createHash } from "node:crypto";
import z from "zod";

import { generateRandomString } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

/**
 * Time allowed to exchange an authorization code for tokens (single-use).
 */
const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const OAuthAuthCodePayloadSchema = z.object({
  grantId: z.string(),
  userId: z.string(),
  clientId: z.string(),
  redirectUri: z.string(),
  scopes: z.array(z.string()),
  accountIds: z.array(z.string()),
  /** PKCE S256 code challenge (base64url(sha256(verifier))). */
  codeChallenge: z.string(),
  /** Resource indicator (RFC 8707) bound to the resulting tokens. */
  resource: z.string().nullable(),
});

export type OAuthAuthCodePayload = z.infer<typeof OAuthAuthCodePayloadSchema>;

function getKey(code: string) {
  return `oauth:auth-code:${code}`;
}

/**
 * Store a short-lived, single-use authorization code for the auth-code + PKCE
 * flow. Everything needed to mint tokens at exchange time is bound to the code.
 */
export async function createAuthorizationCode(
  payload: OAuthAuthCodePayload,
): Promise<string> {
  const redis = await getRedisClient();
  const code = generateRandomString(40);
  await redis.set(getKey(code), JSON.stringify(payload), {
    expiration: { type: "PX", value: AUTH_CODE_TTL_MS },
  });
  return code;
}

/**
 * Consume an authorization code and verify it against the token request.
 *
 * Returns the bound payload on success, or `null` when the code is
 * missing/expired, already used, bound to a different client/redirect_uri, or
 * the PKCE verifier does not match. The code is deleted before verification so
 * it cannot be replayed.
 */
export async function consumeAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<OAuthAuthCodePayload | null> {
  const redis = await getRedisClient();
  const key = getKey(params.code);
  const json = await redis.get(key);
  if (!json) {
    return null;
  }
  // Delete before verification so the code is strictly single-use.
  await redis.del(key);
  const payload = OAuthAuthCodePayloadSchema.parse(JSON.parse(json));

  if (payload.clientId !== params.clientId) {
    return null;
  }
  // `redirect_uri` must be identical to the one used at the authorize step.
  if (payload.redirectUri !== params.redirectUri) {
    return null;
  }

  // PKCE S256: code_challenge == base64url(sha256(code_verifier)).
  const computedChallenge = createHash("sha256")
    .update(params.codeVerifier)
    .digest("base64url");
  if (computedChallenge !== payload.codeChallenge) {
    return null;
  }

  return payload;
}
