import { promisify } from "util";

async function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function acquireLock({ client, name, timeout, retryDelay }) {
  const result = await client.set(name, "1", "PX", timeout, "NX");
  if (result === null) {
    await delay(retryDelay);
    return acquireLock({ client, name, timeout, retryDelay });
  }
  return undefined;
}

export function createRedisLock(client) {
  const set = promisify(client.set).bind(client);
  const del = promisify(client.del).bind(client);
  const promiseClient = { set, del };

  async function lock(name, task, { timeout = 20000, retryDelay = 500 } = {}) {
    const fullName = `lock.${name}`;

    await acquireLock({
      client: promiseClient,
      name: fullName,
      timeout,
      retryDelay,
    });
    const result = await task();
    await promiseClient.del(fullName);
    return result;
  }

  return lock;
}
