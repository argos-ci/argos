import { createRedisCacheClient } from "./cache.js";
import { getRedisClient } from "./client.js";
import { createRedisLockClient } from "./lock.js";

export const redisLock = createRedisLockClient({ getRedisClient });
export const redisCache = createRedisCacheClient({ getRedisClient });
