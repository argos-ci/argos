import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";
import type { RedisClient } from "redis";

const acquireLock = async ({
  client,
  name,
  timeout,
  retryDelay,
}: {
  client: RedisClient;
  name: string;
  timeout: number;
  retryDelay: number;
}) => {
  const result = await promisify(
    (cb: (err: Error | null, res: "OK" | undefined) => void) => {
      client.set(name, "1", "PX", timeout, "NX", cb);
    }
  )();

  if (result !== "OK") {
    await setTimeout(retryDelay);
    await acquireLock({ client, name, timeout, retryDelay });
  }
};

export type RedisLock = <T>(
  name: string,
  task: () => Promise<T>,
  options?: { timeout?: number; retryDelay?: number }
) => Promise<T>;

export const createRedisLock = (client: RedisClient): RedisLock => {
  const lock: RedisLock = async (
    name,
    task,
    { timeout = 20000, retryDelay = 500 } = {}
  ) => {
    const fullName = `lock.${name}`;

    await acquireLock({
      client,
      name: fullName,
      timeout,
      retryDelay,
    });
    const result = await task();
    await promisify((cb: (err: Error | null, res: number) => void) => {
      client.del(fullName, cb);
    })();
    return result;
  };

  return lock;
};
