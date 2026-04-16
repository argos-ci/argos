import { createHash } from "node:crypto";
import z from "zod";

import { generateRandomString } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

/**
 * Time allowed to exchange a CLI auth code for a token.
 */
const EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CliAuthCodePayloadSchema = z.object({
  token: z.string(),
  codeChallenge: z.string(),
});

type CliAuthCodePayload = z.infer<typeof CliAuthCodePayloadSchema>;

function getAuthCodeKey(code: string) {
  return `cli:auth-code:${code}`;
}

/**
 * Store a short-lived authorization code for the PKCE CLI flow.
 * The code is single-use and expires in 5 minutes.
 */
export async function createCliAuthCode(
  payload: CliAuthCodePayload,
): Promise<string> {
  const redis = await getRedisClient();
  const code = generateRandomString(40);
  await redis.set(getAuthCodeKey(code), JSON.stringify(payload), {
    expiration: {
      type: "PX",
      value: EXCHANGE_CODE_TTL_MS,
    },
  });
  return code;
}

/**
 * Consume a CLI auth code and verify the PKCE code_verifier.
 * Returns the token if valid, or null if the code is missing/expired/invalid.
 */
export async function exchangeCliAuthCode(
  code: string,
  codeVerifier: string,
): Promise<string | null> {
  const redis = await getRedisClient();
  const key = getAuthCodeKey(code);
  const json = await redis.get(key);
  if (!json) {
    return null;
  }
  // Delete before verification so the code can't be reused on a timing attack
  await redis.del(key);
  const payload = CliAuthCodePayloadSchema.parse(JSON.parse(json));

  // PKCE S256: code_challenge == base64url(sha256(code_verifier))
  const computedChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  if (computedChallenge !== payload.codeChallenge) {
    return null;
  }

  return payload.token;
}
