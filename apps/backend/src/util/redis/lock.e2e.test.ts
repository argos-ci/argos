import { setTimeout as delay } from "node:timers/promises";
import { createClient, RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import config from "@/config";

import { createRedisLockClient } from "./lock";
import { createResolvablePromise } from "./test-util";

describe("redis-lock", () => {
  let client: RedisClientType;

  beforeEach(async () => {
    client = createClient({ url: config.get("redis.url") });
    await client.connect();
    await client.del("lock.x");
    await client.del("coalesce.x");
    await client.del("coalesce-rerun.x");
  });

  afterEach(async () => {
    await client.quit();
  });

  it("takes lock", async () => {
    const lock = createRedisLockClient({ getRedisClient: async () => client });
    const p1 = createResolvablePromise();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const l1 = lock.acquire(["x"], async () => p1).then(spy1);
    const l2 = lock
      .acquire(["x"], async () => "second", {
        retryDelay: { min: 30, max: 40 },
      })
      .then(spy2);
    await delay(10);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
    p1.resolve("first");
    await delay(10);
    expect(spy1).toHaveBeenCalledExactlyOnceWith("first");
    expect(spy2).not.toHaveBeenCalledWith("second");
    await delay(50);
    expect(spy2).toHaveBeenCalledExactlyOnceWith("second");
    await l1;
    await l2;
  });

  describe("coalesce", () => {
    it("runs the task without a delay by default", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const result = await lock.coalesce(["x"], async () => "value");
      expect(result).toBe("value");
    });

    it("runs the task after the delay and returns its result", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const spy = vi.fn(async () => "value");
      const start = Date.now();
      const result = await lock.coalesce(["x"], spy, { delay: 50 });
      const elapsed = Date.now() - start;
      expect(result).toBe("value");
      expect(spy).toHaveBeenCalledOnce();
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it("coalesces concurrent callers into a single execution", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const spy = vi.fn(async () => "value");
      const [r1, r2, r3] = await Promise.all([
        lock.coalesce(["x"], spy, { delay: 50 }),
        lock.coalesce(["x"], spy, { delay: 50 }),
        lock.coalesce(["x"], spy, { delay: 50 }),
      ]);
      expect(spy).toHaveBeenCalledOnce();
      const results = [r1, r2, r3];
      expect(results.filter((r) => r === "value")).toHaveLength(1);
      expect(results.filter((r) => r === null)).toHaveLength(2);
    });

    it("returns null immediately for concurrent callers while task runs", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const p1 = createResolvablePromise();
      const spy1 = vi.fn(() => p1);
      const spy2 = vi.fn(async () => "second");
      const l1 = lock.coalesce(["x"], spy1, { delay: 10 });
      await delay(30);
      // First caller is past the delay, now executing task. Second caller
      // arrives — should return null without running.
      const r2 = await lock.coalesce(["x"], spy2, { delay: 10 });
      expect(r2).toBeNull();
      expect(spy2).not.toHaveBeenCalled();
      p1.resolve("first");
      expect(await l1).toBe("first");
    });

    it("re-runs the task when a caller arrives during execution", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const p1 = createResolvablePromise();
      let callCount = 0;
      const task = vi.fn(() => {
        callCount++;
        // First call blocks until p1 resolves; later calls return quickly.
        return callCount === 1 ? p1 : Promise.resolve("rerun");
      });
      const l1 = lock.coalesce(["x"], task, { delay: 10 });
      // Wait until the task is running (past the delay).
      await delay(30);
      // Bailer arrives during the task — flags rerun and returns null.
      const r2 = await lock.coalesce(["x"], task, { delay: 10 });
      expect(r2).toBeNull();
      expect(task).toHaveBeenCalledOnce();
      // Let the first task finish — runner should detect the rerun flag
      // and run the task again.
      p1.resolve("first");
      const r1 = await l1;
      expect(task).toHaveBeenCalledTimes(2);
      expect(r1).toBe("rerun");
    });

    it("allows a new claim after the task completes", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const r1 = await lock.coalesce(["x"], async () => "first", { delay: 10 });
      const r2 = await lock.coalesce(["x"], async () => "second", {
        delay: 10,
      });
      expect(r1).toBe("first");
      expect(r2).toBe("second");
    });

    it("releases the claim when the task throws", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      await expect(() =>
        lock.coalesce(
          ["x"],
          async () => {
            throw new Error("boom");
          },
          { delay: 10 },
        ),
      ).rejects.toThrow("boom");
      const r2 = await lock.coalesce(["x"], async () => "second", {
        delay: 10,
      });
      expect(r2).toBe("second");
    });

    it("does not delete a successor's claim when the task throws", async () => {
      // Simulates: our TTL expired, another caller acquired, then our task
      // errored. The atomic compare-and-delete in the error path must NOT
      // remove the successor's claim.
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      await expect(() =>
        lock.coalesce(["x"], async () => {
          // Overwrite the claim with a foreign id before throwing.
          await client.set("coalesce.x", "stranger");
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(await client.get("coalesce.x")).toBe("stranger");
    });

    it("refreshes the claim TTL on each rerun iteration", async () => {
      // With a short timeout, a first task that consumes most of it would
      // leave little or no TTL for the rerun. The script's PEXPIRE on
      // "continue" must restore the full timeout before the next iteration.
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const timeout = 2000;
      let callCount = 0;
      let pttlBeforeRerun = 0;
      let pttlAfterRerun = 0;
      const task = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // Burn most of the timeout.
          await delay(timeout - 500);
          pttlBeforeRerun = await client.pTTL("coalesce.x");
          // Trigger a rerun.
          await client.set("coalesce-rerun.x", "1");
          return "first";
        }
        pttlAfterRerun = await client.pTTL("coalesce.x");
        return "second";
      });
      const result = await lock.coalesce(["x"], task, { timeout });
      expect(callCount).toBe(2);
      expect(result).toBe("second");
      // Before the rerun, TTL is close to expiring.
      expect(pttlBeforeRerun).toBeLessThan(700);
      // After the script's PEXPIRE, TTL is back near the full timeout.
      expect(pttlAfterRerun).toBeGreaterThan(timeout - 200);
    });

    it("stops looping when claim ownership is lost", async () => {
      // If the claim's TTL expires and another caller acquires it, the
      // script returns "lost". The runner must exit without clobbering the
      // new owner's keys.
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      let callCount = 0;
      const task = vi.fn(async () => {
        callCount++;
        // Take over the claim and signal a rerun. The script should detect
        // the ownership loss first and refuse to clear rerun or delete the
        // claim.
        await client.set("coalesce.x", "stranger");
        await client.set("coalesce-rerun.x", "1");
        return "first";
      });
      const result = await lock.coalesce(["x"], task);
      expect(callCount).toBe(1);
      expect(result).toBe("first");
      // The new owner's claim and the rerun signal are intact.
      expect(await client.get("coalesce.x")).toBe("stranger");
      expect(await client.get("coalesce-rerun.x")).toBe("1");
    });
  });

  it("does not delete a successor's claim when acquire's task throws", async () => {
    // Simulates: our lock TTL expired, another caller acquired, then our
    // task errored. The atomic compare-and-delete in the finally must NOT
    // remove the successor's claim.
    const lock = createRedisLockClient({ getRedisClient: async () => client });
    await expect(() =>
      lock.acquire(["x"], async () => {
        await client.set("lock.x", "stranger");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await client.get("lock.x")).toBe("stranger");
  });

  it("handles errors", async () => {
    const lock = createRedisLockClient({ getRedisClient: async () => client });
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const l1 = lock
      .acquire(["x"], async () => "first", {
        retryDelay: { min: 30, max: 40 },
      })
      .then(spy1);
    const l2 = lock
      .acquire(["x"], async () => "second", {
        retryDelay: { min: 30, max: 40 },
      })
      .then(spy2);
    await expect(() =>
      lock.acquire(
        ["x"],
        async () => {
          throw new Error("Expected to fail");
        },
        {
          retryDelay: { min: 30, max: 40 },
        },
      ),
    ).rejects.toThrow("Expected to fail");
    await l1;
    await l2;
  });
});
