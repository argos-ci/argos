import { createRedisCacheClient } from "./cache";
import { getRedisClient } from "./client";
import { createRedisLockClient } from "./lock";
import { createRedisPubSubClient } from "./pubsub";

export const redisLock = createRedisLockClient({ getRedisClient });
export const redisCache = createRedisCacheClient({ getRedisClient });
export const redisPubSub = createRedisPubSubClient({ getRedisClient });
