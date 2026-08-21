import type { KeyObject } from "node:crypto";
import { z } from "zod";

import config from "@/config";
import parentLogger from "@/logger";
import { boom } from "@/util/error";
import { redisCache } from "@/util/redis";

import { publicKeyFromJwk } from "./jwt";

const logger = parentLogger.child({ module: "origin/jwks" });

/**
 * Origin's active signing keys. The same keys sign webhook deliveries and
 * installation receipts, so both verifications read them from here.
 */

const Ed25519JwkSchema = z.object({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  kid: z.string(),
  x: z.string(),
  alg: z.string().optional(),
  use: z.string().optional(),
});

/**
 * Unknown entries are dropped rather than failing the document: Origin may
 * publish a key Argos does not model, and one such key must not take every
 * usable key down with it.
 */
const JsonWebKeySetSchema = z.object({
  keys: z
    .array(z.unknown())
    .default([])
    .transform((keys) =>
      keys.flatMap((key) => {
        const parsed = Ed25519JwkSchema.safeParse(key);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
});

type Ed25519Jwk = z.infer<typeof Ed25519JwkSchema>;

const jwksStore = redisCache.createStore({
  maxAge: 5 * 60 * 1000,
  timeout: 10 * 1000,
  fetch: async (): Promise<Ed25519Jwk[]> => {
    const response = await fetch(`${config.get("origin.apiBaseUrl")}/keys`);
    if (!response.ok) {
      throw boom(502, "Unable to fetch Origin signing keys");
    }
    const jwks = JsonWebKeySetSchema.parse(await response.json());
    return jwks.keys;
  },
  getCacheKey: () => ["origin-jwks"],
});

/**
 * Get Origin's active signing keys as `node:crypto` public keys.
 */
export async function getOriginSigningKeys(): Promise<
  { kid: string; key: KeyObject }[]
> {
  const jwks = await jwksStore.get();
  // A key that cannot be built reads as one fewer key to try, never as a
  // crash: callers verify signatures, and a throw here would answer 5xx to a
  // webhook — making Origin redeliver — instead of rejecting it.
  return jwks.flatMap((jwk) => {
    try {
      return [
        {
          kid: jwk.kid,
          key: publicKeyFromJwk({ kty: jwk.kty, crv: jwk.crv, x: jwk.x }),
        },
      ];
    } catch (error) {
      logger.warn({ error, kid: jwk.kid }, "Unusable Origin signing key");
      return [];
    }
  });
}
