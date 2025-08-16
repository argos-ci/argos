import { RedisStore } from "rate-limit-redis";

import { getRedisClient } from "./redis/client.js";

export function createRedisStore(name: string) {
  return new RedisStore({
    prefix: `rate-limit-${name}`,
    sendCommand: async (...args: string[]) => {
      const client = await getRedisClient();
      return client.sendCommand(args);
    },
  });
}
