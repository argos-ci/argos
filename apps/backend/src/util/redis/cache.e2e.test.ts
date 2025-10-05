import { setTimeout as delay } from "node:timers/promises";
import { createClient, RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import config from "@/config/index.js";

import { createRedisCacheClient } from "./cache.js";

describe("redis-cache", () => {
  let client: RedisClientType;

  beforeEach(async () => {
    client = createClient({ url: config.get("redis.url") });
    await client.connect();
    await Promise.all([client.del("cache.x"), client.del("cache.y")]);
  });

  afterEach(async () => {
    await client.quit();
  });

  it("fetches the first time and get from cache the second time", async () => {
    const redisCache = createRedisCacheClient({
      getRedisClient: async () => client,
    });
    const fetch = vi.fn(async (value: string) => value);
    const store = redisCache.createStore({
      fetch,
      getCacheKey: (value) => [value],
    });
    const res = await store.get("x");
    const res2 = await store.get("x");
    expect(res).toBe("x");
    expect(res2).toBe("x");
    expect(fetch).toHaveBeenCalledExactlyOnceWith("x");
    const res3 = await store.get("y");
    expect(res3).toBe("y");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith("y");
  });

  it("supports concurrency", async () => {
    const redisCache = createRedisCacheClient({
      getRedisClient: async () => client,
    });
    const fetch = vi.fn(async (value: string) => {
      await delay(100 + 100 * Math.random());
      return value;
    });
    const store = redisCache.createStore({
      fetch,
      getCacheKey: (value) => [value],
    });
    const [res, res2] = await Promise.all([store.get("x"), store.get("x")]);
    expect(res).toBe("x");
    expect(res2).toBe("x");
    expect(fetch).toHaveBeenCalledExactlyOnceWith("x");
  });
});
