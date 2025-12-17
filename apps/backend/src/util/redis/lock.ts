import type { RedisClientType } from "redis";

import { hashCacheKey, type CacheKey } from "./cache-key";

async function acquireLock({
  client,
  name,
  timeout,
  retryDelay,
}: {
  client: RedisClientType;
  name: string;
  timeout: number;
  retryDelay: { min: number; max: number };
}) {
  return new Promise<string>((resolve, reject) => {
    function tryAcquire() {
      const rdn = crypto.randomUUID();
      client
        .set(name, rdn, {
          expiration: {
            type: "PX",
            value: timeout,
          },
          condition: "NX",
        })
        .then((result) => {
          if (result === "OK") {
            resolve(rdn);
          } else {
            const adjustedTimeout =
              retryDelay.min +
              Math.ceil(Math.random() * (retryDelay.max - retryDelay.min));
            setTimeout(tryAcquire, adjustedTimeout);
          }
        })
        .catch(reject);
    }

    tryAcquire();
  });
}

/**
 * Create a Redis lock client.
 */
export function createRedisLockClient(options: {
  getRedisClient: () => Promise<RedisClientType>;
}) {
  return {
    /**
     * Acquire the lock in Redis.
     */
    async acquire<T>(
      key: CacheKey,
      task: () => Promise<T>,
      { timeout = 20000, retryDelay = { min: 100, max: 200 } } = {},
    ) {
      const hash = hashCacheKey(key);
      const fullName = `lock.${hash}`;
      const client = await options.getRedisClient();
      const id = await acquireLock({
        client,
        name: fullName,
        timeout,
        retryDelay,
      });
      let timer: NodeJS.Timeout | null = null;
      try {
        const result = (await Promise.race([
          task(),
          new Promise((_resolve, reject) => {
            timer = setTimeout(() => {
              reject(new Error(`Lock timeout "${hash}" after ${timeout}ms`));
            }, timeout);
          }),
        ])) as T;
        return result;
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
        const value = await client.get(fullName);
        if (value === id) {
          await client.del(fullName);
        }
      }
    },
  };
}
