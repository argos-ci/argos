import { callbackify } from "node:util";
import { createClient } from "redis";

import config from "@argos-ci/config";
import logger from "@argos-ci/logger";

import { createRedisLock } from "./lock.js";

const redisClient = createClient({ url: config.get("redis.url") });
redisClient.on("error", (err: unknown) => {
  logger.error(err);
});
redisClient.on("connect", () => {
  logger.info("Redis client is connected");
});
redisClient.on("reconnecting", () => {
  logger.info("Redis client is reconnecting");
});
redisClient.on("ready", () => {
  logger.info("Redis client is ready");
});

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
