import { createRedisCacheClient } from "./cache";
import { getRedisClient } from "./client";
import { createRedisLockClient } from "./lock";

export const redisLock = createRedisLockClient({ getRedisClient });
export const redisCache = createRedisCacheClient({ getRedisClient });
