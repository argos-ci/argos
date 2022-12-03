import { callbackify } from "node:util";
import { createClient } from "redis";

import config from "@argos-ci/config";

import { createRedisLock } from "./lock.js";

const redisClient = createClient({ url: config.get("redis.url") });
const redisLock = createRedisLock(redisClient);

let connection: Promise<void> | null = null;

export const getRedisLock = async () => {
  connection = connection || redisClient.connect();
  await connection;
  return redisLock;
};

export const quitRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
  }
};

process.on("SIGTERM", () => {
  callbackify(quitRedis)((err) => {
    if (err) throw err;
  });
});
