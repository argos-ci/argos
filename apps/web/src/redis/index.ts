import { callbackify } from "node:util";
import { createClient } from "redis";

import config from "@argos-ci/config";
import logger from "@argos-ci/logger";

import { createRedisLock } from "./lock.js";

const redisClient = createClient({ url: config.get("redis.url") });
redisClient.on("error", (err: unknown) => {
  // Ignore this error, it will reconnect anyway
  if ((err as { message: string }).message === "Socket closed unexpectedly") {
    return;
  }
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

let status: "connecting" | "connected" | "disconnecting" | "disconnected" =
  "disconnected";
let connection: Promise<void> | null = null;
let disconnection: Promise<void> | null = null;

export const getRedisLock = async () => {
  switch (status) {
    case "connected":
      return redisLock;
    case "connecting": {
      await connection;
      return redisLock;
    }
    case "disconnected": {
      connection = redisClient.connect();
      status = "connecting";
      await connection;
      status = "connected";
      connection = null;
      return redisLock;
    }
    case "disconnecting": {
      throw new Error("Redis is disconnecting");
    }
    default: {
      throw new Error(`Unknown status: ${status}`);
    }
  }
};

export const quitRedis = async () => {
  switch (status) {
    case "connected": {
      disconnection = redisClient.quit();
      status = "disconnecting";
      await disconnection;
      status = "disconnected";
      disconnection = null;
      return;
    }
    case "connecting": {
      throw new Error("Redis is connecting");
    }
    case "disconnected": {
      return;
    }
    case "disconnecting": {
      await disconnection;
      return;
    }
    default: {
      throw new Error(`Unknown status: ${status}`);
    }
  }
};

process.on("SIGTERM", () => {
  callbackify(quitRedis)((err) => {
    if (err) throw err;
  });
});
