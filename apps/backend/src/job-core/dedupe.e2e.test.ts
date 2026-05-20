import { setTimeout as delay } from "node:timers/promises";
import { createClient, RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import config from "@/config";

import { createDedupeClient } from "./dedupe";

const SCOPE = "test-scope";
const TTL_MS = 1_000;

function claimKey(value: string) {
  return `job-dedupe.${SCOPE}.${value}`;
}

function rerunKey(value: string) {
  return `job-dedupe-rerun.${SCOPE}.${value}`;
}

describe("createDedupeClient", () => {
  let client: RedisClientType;

  beforeEach(async () => {
    client = createClient({ url: config.get("redis.url") });
    await client.connect();
    await client.del(claimKey("v1"));
    await client.del(rerunKey("v1"));
    await client.del(claimKey("v2"));
    await client.del(rerunKey("v2"));
  });

  afterEach(async () => {
    await client.quit();
  });

  const buildDedupe = (ttlMs = TTL_MS) =>
    createDedupeClient<string>({
      scope: SCOPE,
      ttlMs,
      getRedisClient: async () => client,
    });

  describe("tryClaim", () => {
    it("returns a fresh token on first claim", async () => {
      const dedupe = buildDedupe();
      const token = await dedupe.tryClaim("v1");
      expect(token).toBeTruthy();
      const stored = await client.get(claimKey("v1"));
      expect(stored).toBe(token);
    });

    it("returns undefined and sets rerun flag when claim is already held", async () => {
      const dedupe = buildDedupe();
      const first = await dedupe.tryClaim("v1");
      const second = await dedupe.tryClaim("v1");
      expect(first).toBeTruthy();
      expect(second).toBeUndefined();
      expect(await client.get(rerunKey("v1"))).toBe("1");
      // First claim is still ours — bailed push must not overwrite the
      // claim value.
      expect(await client.get(claimKey("v1"))).toBe(first);
    });

    it("scopes claims per value", async () => {
      const dedupe = buildDedupe();
      const t1 = await dedupe.tryClaim("v1");
      const t2 = await dedupe.tryClaim("v2");
      expect(t1).toBeTruthy();
      expect(t2).toBeTruthy();
      expect(t1).not.toBe(t2);
    });
  });

  describe("releaseOrContinue", () => {
    it("returns 'done' and releases the claim when no rerun is set", async () => {
      const dedupe = buildDedupe();
      const token = await dedupe.tryClaim("v1");
      const decision = await dedupe.releaseOrContinue("v1", token!);
      expect(decision).toBe("done");
      expect(await client.get(claimKey("v1"))).toBeNull();
    });

    it("returns 'continue' when rerun is set; clears rerun and refreshes the claim TTL", async () => {
      const dedupe = buildDedupe(300);
      const token = await dedupe.tryClaim("v1");
      await dedupe.tryClaim("v1"); // bailer sets rerun

      // Wait long enough that, without TTL refresh, the claim would
      // have expired. The script must PEXPIRE it back to full TTL.
      await delay(200);
      const decision = await dedupe.releaseOrContinue("v1", token!);
      expect(decision).toBe("continue");
      expect(await client.get(rerunKey("v1"))).toBeNull();
      expect(await client.get(claimKey("v1"))).toBe(token);

      // Wait past the original TTL — claim must still be alive because
      // it was refreshed.
      await delay(150);
      expect(await client.get(claimKey("v1"))).toBe(token);
    });

    it("returns 'lost' when the claim is owned by a different token", async () => {
      const dedupe = buildDedupe();
      const ownToken = await dedupe.tryClaim("v1");
      // Simulate TTL expiry + a later push taking over the claim.
      await dedupe.releaseIfOwned("v1", ownToken!);
      const newToken = await dedupe.tryClaim("v1");
      expect(newToken).not.toBe(ownToken);

      const decision = await dedupe.releaseOrContinue("v1", ownToken!);
      expect(decision).toBe("lost");
      // The newer owner's claim must be untouched.
      expect(await client.get(claimKey("v1"))).toBe(newToken);
    });

    it("returns 'lost' when the claim no longer exists", async () => {
      const dedupe = buildDedupe();
      const decision = await dedupe.releaseOrContinue("v1", "made-up-token");
      expect(decision).toBe("lost");
    });
  });

  describe("releaseIfOwned", () => {
    it("releases the claim and rerun flag when our token still owns the claim", async () => {
      const dedupe = buildDedupe();
      const token = await dedupe.tryClaim("v1");
      await dedupe.tryClaim("v1"); // bailer sets rerun
      await dedupe.releaseIfOwned("v1", token!);
      expect(await client.get(claimKey("v1"))).toBeNull();
      expect(await client.get(rerunKey("v1"))).toBeNull();
    });

    it("is a no-op when our token no longer owns the claim", async () => {
      const dedupe = buildDedupe();
      const ownToken = await dedupe.tryClaim("v1");
      await dedupe.releaseIfOwned("v1", ownToken!);
      const newToken = await dedupe.tryClaim("v1");

      await dedupe.releaseIfOwned("v1", ownToken!);
      // The new owner's claim must survive.
      expect(await client.get(claimKey("v1"))).toBe(newToken);
    });
  });

  describe("claim expiry", () => {
    it("auto-releases via Redis TTL", async () => {
      const dedupe = buildDedupe(150);
      await dedupe.tryClaim("v1");
      await delay(250);
      expect(await client.get(claimKey("v1"))).toBeNull();
      // A subsequent push can re-claim.
      const next = await dedupe.tryClaim("v1");
      expect(next).toBeTruthy();
    });
  });
});
