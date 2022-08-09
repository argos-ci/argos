import { callbackify } from "util";
import redis from "redis";
import config from "@argos-ci/config";
import { createRedisLock } from "./lock";

let redisClient;
let redisLock;

export function connect() {
  if (!redisClient) {
    redisClient = redis.createClient({ url: config.get("redis.url") });
    redisLock = createRedisLock(redisClient);
  }

  return redisClient;
}

export function getRedisClient() {
  return redisClient;
}

export function getRedisLock() {
  return redisLock;
}

export async function quitRedis() {
  return new Promise((resolve, reject) => {
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
}

process.on("SIGTERM", () => {
  callbackify(quitRedis)((err) => {
    if (err) throw err;
  });
});
