import * as Sentry from "@sentry/node";
import type { RedisClientType } from "redis";

import { hashCacheKey, type CacheKey } from "./cache-key";

// Atomically decides whether the runner should loop again or release the
// claim. If a "rerun" flag was set by a bailer, clear it and return
// "continue". Otherwise release the claim (only if still owned by this
// runner) and return "done". Atomicity closes the race between checking
// the rerun flag and releasing the claim.
const RELEASE_OR_CONTINUE_SCRIPT = `
local rerun = redis.call("GET", KEYS[2])
if rerun then
  redis.call("DEL", KEYS[2])
  return "continue"
end
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("DEL", KEYS[1])
end
return "done"
`;

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
     * Coalesce a burst of calls into single-flight executions.
     *
     * The first caller claims the window and runs the task. Concurrent
     * callers return `null` immediately; if they arrive *during* the
     * running task, they flag a "rerun" so the runner repeats the task
     * once more after its current pass — this captures work that became
     * visible only after the task's read started.
     *
     * Optionally takes a `delay` (default 0): the runner sleeps `delay`
     * ms before its first task run, giving concurrent callers a window to
     * accumulate so their work is captured in a single task run instead
     * of via the rerun loop. Useful when the task is expensive and the
     * burst is expected to spread over a known interval.
     *
     * The bailer always sets the rerun flag *before* retrying the claim,
     * and the runner uses a Lua script to atomically check-and-clear
     * rerun or release the claim. Together these close the race where a
     * bailer's signal could be lost between the runner's last check and
     * its claim release.
     *
     * Trade-off: the runner may run the task one extra time (idempotent
     * pass) rather than miss a signal — we err toward "run too many" over
     * "skip a needed run".
     */
    async coalesce<T>(
      key: CacheKey,
      task: () => Promise<T>,
      { delay = 0, timeout = 20000 }: { delay?: number; timeout?: number } = {},
    ): Promise<T | null> {
      const hash = hashCacheKey(key);
      const claimKey = `coalesce.${hash}`;
      const rerunKey = `coalesce-rerun.${hash}`;
      const keyTtl = delay + timeout;
      return Sentry.startSpan(
        {
          name: "redis.coalesce",
          attributes: {
            "argos.coalesce.name": claimKey,
            "argos.coalesce.hash": hash,
            "argos.coalesce.delay_ms": delay,
            "argos.coalesce.timeout_ms": timeout,
          },
        },
        async () => {
          const client = await options.getRedisClient();
          const id = crypto.randomUUID();

          const tryClaim = () =>
            client.set(claimKey, id, {
              expiration: { type: "PX", value: keyTtl },
              condition: "NX",
            });

          let claimed = await tryClaim();
          if (claimed !== "OK") {
            // Set rerun *before* retrying the claim. This ordering closes
            // the race: if the active runner is about to release, our
            // retry will succeed and we become the new runner; otherwise
            // the runner will see our rerun flag.
            await client.set(rerunKey, "1", {
              expiration: { type: "PX", value: keyTtl },
            });
            claimed = await tryClaim();
            if (claimed !== "OK") {
              return null;
            }
          }

          const runTask = (): Promise<T> => {
            let timer: NodeJS.Timeout | null = null;
            return Sentry.startSpan(
              {
                name: "redis.coalesce.task",
                attributes: {
                  "argos.coalesce.name": claimKey,
                  "argos.coalesce.hash": hash,
                  "argos.coalesce.timeout_ms": timeout,
                },
              },
              () =>
                Promise.race([
                  task(),
                  new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => {
                      reject(
                        new Error(
                          `Coalesce timeout "${hash}" after ${timeout}ms`,
                        ),
                      );
                    }, timeout);
                  }),
                ]).finally(() => {
                  if (timer) {
                    clearTimeout(timer);
                  }
                }),
            );
          };

          try {
            if (delay > 0) {
              await new Promise<void>((resolve) => {
                setTimeout(resolve, delay);
              });
            }
            let lastResult: T;
            // Atomically check rerun-or-release after each task. The Lua
            // script guarantees there is no window in which a bailer's
            // signal can land between the check and the release.
            let decision: unknown;
            do {
              // Clear rerun before running. Any bailer that arrives during
              // the task will SET it again and trigger another iteration.
              await client.del(rerunKey);
              lastResult = await runTask();
              decision = await client.eval(RELEASE_OR_CONTINUE_SCRIPT, {
                keys: [claimKey, rerunKey],
                arguments: [id],
              });
            } while (decision === "continue");
            return lastResult;
          } catch (err) {
            // Task threw — release the claim explicitly. Any pending rerun
            // signal is left in place so the next caller picks it up.
            const value = await client.get(claimKey);
            if (value === id) {
              await client.del(claimKey);
            }
            throw err;
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
