import * as Sentry from "@sentry/node";
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
  return Sentry.startSpan(
    {
      name: "redis.lock.wait",
      op: "argos.redis-lock",
      attributes: {
        "argos.lock.name": name,
        "argos.lock.timeout_ms": timeout,
        "argos.lock.retry_delay_min_ms": retryDelay.min,
        "argos.lock.retry_delay_max_ms": retryDelay.max,
      },
    },
    () =>
      new Promise<string>((resolve, reject) => {
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
      }),
  );
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
      return Sentry.startSpan(
        {
          name: "redis.lock.acquire",
          op: "argos.redis-lock",
          attributes: {
            "argos.lock.hash": hash,
            "argos.lock.timeout_ms": timeout,
            "argos.lock.retry_delay_min_ms": retryDelay.min,
            "argos.lock.retry_delay_max_ms": retryDelay.max,
          },
        },
        async () => {
          const client = await options.getRedisClient();
          const id = await acquireLock({
            client,
            name: fullName,
            timeout,
            retryDelay,
          });
          let timer: NodeJS.Timeout | null = null;
          try {
            const result = (await Sentry.startSpan(
              {
                name: "redis.lock.task",
                op: "argos.redis-lock",
                attributes: {
                  "argos.lock.hash": hash,
                  "argos.lock.timeout_ms": timeout,
                },
              },
              () =>
                Promise.race([
                  task(),
                  new Promise((_resolve, reject) => {
                    timer = setTimeout(() => {
                      reject(
                        new Error(`Lock timeout "${hash}" after ${timeout}ms`),
                      );
                    }, timeout);
                  }),
                ]),
            )) as T;
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
      );
    },
  };
}
