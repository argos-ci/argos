import { callbackify } from "node:util";
import redis from "redis";

import config from "@argos-ci/config";

import { createRedisLock } from "./lock.js";
import type { RedisLock } from "./lock.js";

let redisClient: redis.RedisClient | null = null;
let redisLock: RedisLock | null = null;

const init = () => {
  if (!redisClient) {
    redisClient = redis.createClient({ url: config.get("redis.url") });
    redisLock = createRedisLock(redisClient);
  }
};

export const connect = () => {
  init();
  return redisClient;
};

export const getRedisClient = () => {
  init();
  return redisClient as redis.RedisClient;
};

export const getRedisLock = () => {
  init();
  return redisLock as RedisLock;
};

export const quitRedis = async () => {
  return new Promise<void>((resolve, reject) => {
    if (!redisClient) {
      resolve();
      return;
    }

    redisClient.quit((error) => {
      if (error) {
        reject(error);
      } else {
        redisClient = null;
        resolve();
      }
    });
  });
};

process.on("SIGTERM", () => {
  callbackify(quitRedis)((err) => {
    if (err) throw err;
  });
});
