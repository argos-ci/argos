import { assertNever } from "@argos/util/assertNever";
import {
  ConnectionTimeoutError,
  createClient,
  RedisClientType,
  SocketClosedUnexpectedlyError,
} from "redis";

import config from "@/config/index.js";
import logger from "@/logger/index.js";

import { createRedisLock } from "./lock.js";

const redisURL = new URL(config.get("redis.url"));

export const redisClient: RedisClientType = createClient({
  url: config.get("redis.url"),
  socket:
    redisURL.protocol === "rediss:"
      ? {
          tls: true,
          host: redisURL.hostname,
          rejectUnauthorized: false,
        }
      : { tls: false },
});
redisClient.on("error", (error: unknown) => {
  // Ignore these errors, Redis will automatically reconnect
  if (error instanceof ConnectionTimeoutError) {
    return;
  }
  if (error instanceof SocketClosedUnexpectedlyError) {
    return;
  }
  logger.error(error);
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
let connection: Promise<unknown> | null = null;
let disconnection: Promise<void> | null = null;

export async function connectToRedis() {
  switch (status) {
    case "connected":
    case "connecting": {
      return connection;
    }
    case "disconnected": {
      connection = redisClient.connect();
      status = "connecting";
      await connection;
      status = "connected";
      connection = null;
      return connection;
    }
    case "disconnecting": {
      throw new Error("Redis is disconnecting");
    }
    default:
      assertNever(status);
  }
}

export async function getRedisLock() {
  await connectToRedis();
  return redisLock;
}

export const quitRedis = async () => {
  switch (status) {
    case "connected": {
      disconnection = redisClient.close();
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
