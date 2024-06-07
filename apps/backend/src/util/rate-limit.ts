import { RedisStore } from "rate-limit-redis";

import { connectToRedis, redisClient } from "./redis/index.js";

export const redisStore = new RedisStore({
  prefix: "rate-limit",
  sendCommand: async (...args: string[]) => {
    await connectToRedis();
    return redisClient.sendCommand(args);
  },
});
