import type { RedisClientType } from "redis";

import { hashCacheKey } from "./cache-key";
import { getRedisClient } from "./client";
import { createRedisLockClient } from "./lock";

export function createRedisCacheClient(clientOptions: {
  getRedisClient: () => Promise<RedisClientType>;
}) {
  const lock = createRedisLockClient(clientOptions);
  return {
    /**
     * Create a store with a fetch function.
     */
    createStore<Args extends unknown[], Result>(options: {
      /**
       * Fetch the data asynchronously.
       */
      fetch: (...args: Args) => Promise<Result>;
      /**
       * Get the cache key.
       */
      getCacheKey: (...args: Args) => (string | number)[];
      /**
       * Max age in milliseconds.
       * @default 86_400_000
       */
      maxAge?: number;
      /**
       * Fetch timeout in milliseconds.
       * @default 3000
       */
      timeout?: number;
      /**
       * Serialize the result into a string.
       * @default JSON.stringify
       */
      serialize?: (res: Result) => string;
      /**
       * Deserialize the result into a string.
       * @default JSON.parse
       */
      deserialize?: (raw: string) => Result;
    }) {
      const {
        fetch,
        getCacheKey,
        timeout = 3000,
        maxAge = 86_400_000,
        serialize = JSON.stringify,
        deserialize = JSON.parse,
      } = options;
      return {
        async get(...args: Args): Promise<Result> {
          const client = await getRedisClient();
          const cacheKey = getCacheKey(...args);
          const hash = hashCacheKey(cacheKey);
          const key = `cache.${hash}`;
          const value = await client.get(key);
          if (value !== null) {
            return deserialize(value);
          }
          const raw = await lock.acquire(
            ["redis-cache", key],
            async () => {
              const value = await client.get(key);
              if (value === null) {
                const result = await fetch(...args);
                const raw = serialize(result);
                await client.set(key, raw, {
                  PX: maxAge,
                });
                return raw;
              }
              return value;
            },
            { timeout },
          );
          return deserialize(raw);
        },
      };
    },
  };
}
