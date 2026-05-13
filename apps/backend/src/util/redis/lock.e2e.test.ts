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
    await client.del("debounce.x");
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

  describe("debounce", () => {
    it("runs the task after the delay and returns its result", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const spy = vi.fn(async () => "value");
      const start = Date.now();
      const result = await lock.debounce(["x"], spy, { delay: 50 });
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
        lock.debounce(["x"], spy, { delay: 50 }),
        lock.debounce(["x"], spy, { delay: 50 }),
        lock.debounce(["x"], spy, { delay: 50 }),
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
      const l1 = lock.debounce(["x"], spy1, { delay: 10 });
      await delay(30);
      // First caller is past the delay, now executing task. Second caller
      // arrives — should return null without running.
      const r2 = await lock.debounce(["x"], spy2, { delay: 10 });
      expect(r2).toBeNull();
      expect(spy2).not.toHaveBeenCalled();
      p1.resolve("first");
      expect(await l1).toBe("first");
    });

    it("allows a new claim after the task completes", async () => {
      const lock = createRedisLockClient({
        getRedisClient: async () => client,
      });
      const r1 = await lock.debounce(["x"], async () => "first", { delay: 10 });
      const r2 = await lock.debounce(["x"], async () => "second", {
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
        lock.debounce(
          ["x"],
          async () => {
            throw new Error("boom");
          },
          { delay: 10 },
        ),
      ).rejects.toThrow("boom");
      const r2 = await lock.debounce(["x"], async () => "second", {
        delay: 10,
      });
      expect(r2).toBe("second");
    });
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
