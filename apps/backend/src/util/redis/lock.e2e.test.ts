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
