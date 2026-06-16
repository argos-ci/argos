import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { redisPubSub } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";
import { setupRedis } from "@/util/redis/testing";

import { getPresence, getPresences, touchPresence } from "./presence";

setupRedis();

describe("presence service", () => {
  let userId: string;

  beforeEach(async () => {
    await setupDatabase();
    const user = await factory.User.create();
    userId = user.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("stores presence and publishes on first activity", async () => {
    const publish = vi
      .spyOn(redisPubSub, "publish")
      .mockResolvedValue(undefined);

    await touchPresence({ userId, timezone: "Europe/Paris" });

    const presence = await getPresence(userId);
    expect(presence?.timezone).toBe("Europe/Paris");
    expect(presence?.lastSeenAt).toBeTypeOf("string");

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(`user-presence-change:${userId}`, {
      userId,
    });
  });

  test("does not republish while the user stays active", async () => {
    await touchPresence({ userId, timezone: "Europe/Paris" });

    const publish = vi
      .spyOn(redisPubSub, "publish")
      .mockResolvedValue(undefined);
    await touchPresence({ userId, timezone: "Europe/Paris" });

    expect(publish).not.toHaveBeenCalled();
  });

  test("republishes after the active window elapses", async () => {
    const redis = await getRedisClient();
    // Seed a stale entry (last seen 6 minutes ago), past the active window.
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    await redis.set(
      `presence:${userId}`,
      JSON.stringify({ lastSeenAt: stale, timezone: "Europe/Paris" }),
    );

    const publish = vi
      .spyOn(redisPubSub, "publish")
      .mockResolvedValue(undefined);
    await touchPresence({ userId, timezone: "Europe/Paris" });

    expect(publish).toHaveBeenCalledTimes(1);
  });

  test("refreshes the entry with a TTL", async () => {
    await touchPresence({ userId });

    const redis = await getRedisClient();
    const ttl = await redis.ttl(`presence:${userId}`);
    expect(ttl).toBeGreaterThan(0);
  });

  test("getPresences returns entries in order, null for unknown users", async () => {
    await touchPresence({ userId, timezone: "Europe/Paris" });

    const result = await getPresences([userId, "999999999"]);
    expect(result[0]?.timezone).toBe("Europe/Paris");
    expect(result[1]).toBeNull();
  });
});
