import type { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

const acquireLock = ({
  client,
  name,
  timeout,
  retryDelay,
}: {
  client: RedisClient;
  name: string;
  timeout: number;
  retryDelay: { min: number; max: number };
}) => {
  return new Promise<string>((resolve, reject) => {
    function tryAcquire() {
      const rdn = Math.random().toString(36);
      client
        .set(name, rdn, {
          PX: timeout,
          NX: true,
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
};

export const createRedisLock = (client: RedisClient) => {
  async function acquire<T>(
    key: (string | number)[],
    task: () => Promise<T>,
    { timeout = 20000, retryDelay = { min: 100, max: 200 } } = {},
  ) {
    const hash = key.join(":");
    const fullName = `lock.${hash}`;
    const id = await acquireLock({
      client,
      name: fullName,
      timeout,
      retryDelay,
    });
    let timer: NodeJS.Timeout | null = null;
    const result = (await Promise.race([
      task(),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Lock timeout "${hash}" after ${timeout}ms`));
        }, timeout);
      }),
    ])) as T;
    if (timer) {
      clearTimeout(timer);
    }
    const value = await client.get(fullName);
    if (value === id) {
      await client.del(fullName);
    }
    return result;
  }

  return { acquire };
};
