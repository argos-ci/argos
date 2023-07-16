import { setTimeout } from "node:timers/promises";
import type { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

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
  const result = await client.set(name, "1", {
    PX: timeout,
    NX: true,
  });

  if (result !== "OK") {
    await setTimeout(retryDelay);
    await acquireLock({ client, name, timeout, retryDelay });
  }
};

export type Acquire = <T>(
  name: string,
  task: () => Promise<T>,
  options?: { timeout?: number; retryDelay?: number }
) => Promise<T>;

export interface RedisLock {
  acquire: Acquire;
}

export const createRedisLock = (client: RedisClient): RedisLock => {
  const acquire: Acquire = async (
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
    await client.del(fullName);
    return result;
  };

  return { acquire };
};
