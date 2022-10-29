import { jest } from "@jest/globals";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import redis from "redis";

import config from "@argos-ci/config";

import { createRedisLock } from "./lock.js";

function createResolvablePromise() {
  const promise = new Promise((r) => {
    setTimeout(() => {
      promise.resolve = r;
    });
  }) as Promise<any> & { resolve: (value: any) => void };
  return promise;
}

describe("redis-lock", () => {
  let client: redis.RedisClient;

  beforeEach(async () => {
    client = redis.createClient({ url: config.get("redis.url") });
    await promisify((cb) => client.del("lock.x", cb));
  });

  afterEach(async () => {
    await promisify(client.quit).bind(client)();
  });

  it("takes lock", async () => {
    const lock = createRedisLock(client);
    const p1 = createResolvablePromise();
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    lock("x", async () => p1).then(spy1);
    lock("x", async () => "second", { retryDelay: 30 }).then(spy2);
    await delay(10);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
    p1.resolve("first");
    await delay(10);
    expect(spy1).toHaveBeenCalledWith("first");
    expect(spy2).not.toHaveBeenCalledWith("second");
    await delay(50);
    expect(spy2).toHaveBeenCalledWith("second");
  });
});
