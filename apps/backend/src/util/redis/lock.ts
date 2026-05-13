import * as Sentry from "@sentry/node";
import type { RedisClientType } from "redis";

import { hashCacheKey, type CacheKey } from "./cache-key";

async function acquireLock({
  client,
  name,
  hash,
  timeout,
  retryDelay,
}: {
  client: RedisClientType;
  name: string;
  hash: string;
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
            Sentry.startSpanManual(
              {
                name: "redis.lock.wait",
                attributes: {
                  "argos.lock.name": name,
                  "argos.lock.hash": hash,
                  "argos.lock.timeout_ms": timeout,
                  "argos.lock.retry_delay_min_ms": retryDelay.min,
                  "argos.lock.retry_delay_max_ms": retryDelay.max,
                  "argos.lock.adjusted_timeout": adjustedTimeout,
                },
              },
              (span) => {
                setTimeout(() => {
                  span.end();
                  tryAcquire();
                }, adjustedTimeout);
              },
            );
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
     * Coalesce a burst of calls into a single delayed execution.
     *
     * The first caller in the debounce window claims it, waits `delay` ms,
     * then runs the task. Concurrent callers that arrive while the window is
     * held return `null` immediately without running the task.
     *
     * Useful when many workers might trigger the same downstream action and
     * only one execution is needed (e.g. concluding a build after a burst
     * of screenshot diffs complete).
     */
    async debounce<T>(
      key: CacheKey,
      task: () => Promise<T>,
      { delay, timeout = 20000 }: { delay: number; timeout?: number },
    ): Promise<T | null> {
      const hash = hashCacheKey(key);
      const fullName = `debounce.${hash}`;
      return Sentry.startSpan(
        {
          name: "redis.debounce",
          attributes: {
            "argos.debounce.name": fullName,
            "argos.debounce.hash": hash,
            "argos.debounce.delay_ms": delay,
            "argos.debounce.timeout_ms": timeout,
          },
        },
        async () => {
          const client = await options.getRedisClient();
          const id = crypto.randomUUID();
          const result = await client.set(fullName, id, {
            expiration: { type: "PX", value: delay + timeout },
            condition: "NX",
          });
          if (result !== "OK") {
            return null;
          }
          let timer: NodeJS.Timeout | null = null;
          try {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, delay);
            });
            const result = (await Sentry.startSpan(
              {
                name: "redis.debounce.task",
                attributes: {
                  "argos.debounce.name": fullName,
                  "argos.debounce.hash": hash,
                  "argos.debounce.timeout_ms": timeout,
                },
              },
              () =>
                Promise.race([
                  task(),
                  new Promise((_resolve, reject) => {
                    timer = setTimeout(() => {
                      reject(
                        new Error(
                          `Debounce timeout "${hash}" after ${timeout}ms`,
                        ),
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
          attributes: {
            "argos.lock.name": fullName,
            "argos.lock.hash": hash,
            "argos.lock.timeout_ms": timeout,
          },
        },
        async () => {
          const client = await options.getRedisClient();
          const id = await acquireLock({
            client,
            name: fullName,
            hash,
            timeout,
            retryDelay,
          });
          let timer: NodeJS.Timeout | null = null;
          try {
            const result = (await Sentry.startSpan(
              {
                name: "redis.lock.task",
                attributes: {
                  "argos.lock.name": fullName,
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
