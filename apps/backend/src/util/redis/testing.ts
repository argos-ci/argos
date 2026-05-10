import { afterAll, afterEach } from "vitest";

import { closeRedis, getRedisClient } from "./client";

export function setupRedis() {
  afterEach(async () => {
    const client = await getRedisClient();
    await client.flushDb();
  });

  afterAll(async () => {
    await closeRedis();
  });
}
