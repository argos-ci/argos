import type { RedisClientType } from "redis";

/**
 * The outcome of {@link DedupeClient.releaseOrContinue}:
 *
 * - `"continue"` — a `rerun` flag was set by a bailed push during the
 *   run. The Lua script cleared it and refreshed the claim TTL; the
 *   runner should loop and call `perform` again to capture the
 *   late-arriving work.
 * - `"done"` — no rerun was pending. The claim has been released and
 *   the runner can exit.
 * - `"lost"` — the claim is no longer ours (TTL expired and a later
 *   push re-claimed). The runner should exit quietly; the new owner's
 *   runner will handle any pending work.
 */
export type DedupeDecision = "continue" | "done" | "lost";

// First checks ownership: if the claim no longer matches our token,
// returns "lost" without touching any keys. Otherwise: if a rerun flag
// is set, clear it + refresh the claim TTL + return "continue". Else
// release the claim and return "done".
//
// KEYS[1] = claim, KEYS[2] = rerun
// ARGV[1] = expected token, ARGV[2] = TTL (ms) to apply on "continue"
const RELEASE_OR_CONTINUE_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if current ~= ARGV[1] then
  return "lost"
end
if redis.call("GET", KEYS[2]) then
  redis.call("DEL", KEYS[2])
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
  return "continue"
end
redis.call("DEL", KEYS[1])
return "done"
`;

// Releases the claim + rerun flag only if the claim still matches our
// token. Used on publish failure and on perform error.
//
// KEYS[1] = claim, KEYS[2] = rerun, ARGV[1] = expected token
const RELEASE_IF_OWNED_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("DEL", KEYS[1])
  redis.call("DEL", KEYS[2])
end
return 1
`;

function parseDedupeDecision(value: unknown): DedupeDecision {
  if (value === "continue" || value === "done" || value === "lost") {
    return value;
  }
  throw new Error(`Unexpected dedupe decision: ${String(value)}`);
}

export interface DedupeClient<TValue extends string | number> {
  /**
   * Try to claim the given value. Returns a fresh token on success.
   * Returns `undefined` if the claim is already held — in that case a
   * `rerun` flag is also set so the active runner picks up our state
   * change after its current pass.
   */
  tryClaim(value: TValue): Promise<string | undefined>;

  /**
   * Release the claim + rerun flag only if `token` still owns the
   * claim. Called from push (on publish failure) and run (on perform
   * error) to make sure we don't accidentally release a newer owner's
   * claim after a TTL race.
   */
  releaseIfOwned(value: TValue, token: string): Promise<void>;

  /**
   * After `perform` finishes: atomically decide whether to loop again
   * (rerun was set), release the claim and exit, or bail because the
   * claim was lost. See {@link DedupeDecision}.
   */
  releaseOrContinue(value: TValue, token: string): Promise<DedupeDecision>;
}

export function createDedupeClient<TValue extends string | number>(opts: {
  /** Prefix used for the Redis claim/rerun keys, e.g. the queue name. */
  scope: string;
  /** Claim/rerun TTL in milliseconds. */
  ttlMs: number;
  getRedisClient: () => Promise<RedisClientType>;
}): DedupeClient<TValue> {
  const { scope, ttlMs, getRedisClient } = opts;
  const claimKey = (value: TValue) => `job-dedupe.${scope}.${value}`;
  const rerunKey = (value: TValue) => `job-dedupe-rerun.${scope}.${value}`;

  return {
    async tryClaim(value) {
      const client = await getRedisClient();
      const token = crypto.randomUUID();
      const claimed = await client.set(claimKey(value), token, {
        condition: "NX",
        expiration: { type: "PX", value: ttlMs },
      });
      if (claimed === "OK") {
        return token;
      }
      await client.set(rerunKey(value), "1", {
        expiration: { type: "PX", value: ttlMs },
      });
      return undefined;
    },
    async releaseIfOwned(value, token) {
      const client = await getRedisClient();
      await client.eval(RELEASE_IF_OWNED_SCRIPT, {
        keys: [claimKey(value), rerunKey(value)],
        arguments: [token],
      });
    },
    async releaseOrContinue(value, token) {
      const client = await getRedisClient();
      const result = await client.eval(RELEASE_OR_CONTINUE_SCRIPT, {
        keys: [claimKey(value), rerunKey(value)],
        arguments: [token, String(ttlMs)],
      });
      return parseDedupeDecision(result);
    },
  };
}
