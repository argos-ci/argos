import { RedisStore } from "rate-limit-redis";

import { getRedisClient } from "./redis/client";

export function createRedisStore(name: string) {
  return new RedisStore({
    prefix: `rl:${name}:`,
    sendCommand: async (...args) => {
      const client = await getRedisClient();
      return client.sendCommand(args);
    },
  });
}
