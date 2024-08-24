import { RedisStore } from "rate-limit-redis";

import { connectToRedis, redisClient } from "./redis/index.js";

export function createRedisStore(name: string) {
  return new RedisStore({
    prefix: `rate-limit-${name}`,
    sendCommand: async (...args: string[]) => {
      await connectToRedis();
      return redisClient.sendCommand(args);
    },
  });
}
