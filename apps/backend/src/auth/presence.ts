import { getRedisClient } from "@/util/redis/client";

import { publishUserPresenceChanged } from "./presenceEvents";

/**
 * How recent `lastSeenAt` must be for a user to count as "active". Used only to
 * decide when to publish a presence event — so we emit on a genuine "came back
 * active" transition rather than on every request. The frontend derives the
 * online/away/offline dot from `lastSeenAt` itself.
 */
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * How long a presence entry is retained (refreshed on every touch). Long enough
 * that `lastSeenAt` stays available to render "last seen …" for a while after a
 * user goes idle. Presence lives only in Redis — there is no Postgres fallback.
 */
const PRESENCE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type UserPresence = {
  /** ISO timestamp of the user's last activity. */
  lastSeenAt: string;
  /** IANA timezone (e.g. "Europe/Paris"), or null when unknown. */
  timezone: string | null;
};

function getRedisKey(userId: string): string {
  return `presence:${userId}`;
}

/**
 * Parse a stored entry, returning `null` for anything corrupt or in an older
 * format so a bad value is treated as "no presence" rather than throwing.
 */
function parsePresence(raw: string | null): UserPresence | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      typeof value.lastSeenAt === "string"
    ) {
      return {
        lastSeenAt: value.lastSeenAt,
        timezone: typeof value.timezone === "string" ? value.timezone : null,
      };
    }
  } catch {
    // Fall through to treat as missing.
  }
  return null;
}

/**
 * Record that a user is active right now. Refreshes the Redis presence entry
 * (sliding its TTL) and, when the user has transitioned from inactive to active,
 * publishes a presence event so open cards flip live.
 *
 * The write + transition-detect is a single atomic `SET … GET`: it always
 * writes (sliding the window) and returns the prior value, so the "became
 * active" decision is race-safe across web instances (a lost race only ever
 * costs a harmless duplicate event).
 */
export async function touchPresence(input: {
  userId: string;
  timezone?: string | null;
}): Promise<void> {
  const { userId } = input;
  const now = Date.now();
  const entry: UserPresence = {
    lastSeenAt: new Date(now).toISOString(),
    timezone: input.timezone ?? null,
  };
  const redis = await getRedisClient();
  const prev = await redis.set(getRedisKey(userId), JSON.stringify(entry), {
    expiration: { type: "EX", value: PRESENCE_TTL_SECONDS },
    GET: true,
  });
  const before = parsePresence(prev);
  const becameActive =
    !before || now - Date.parse(before.lastSeenAt) >= ACTIVE_THRESHOLD_MS;
  if (becameActive) {
    await publishUserPresenceChanged({ userId });
  }
}

/**
 * Read a single user's presence, or `null` when there is no recent activity.
 */
export async function getPresence(
  userId: string,
): Promise<UserPresence | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(getRedisKey(userId));
  return parsePresence(raw);
}

/**
 * Read many users' presence at once (for the GraphQL loader). Order matches the
 * input; entries with no recent activity are `null`.
 */
export async function getPresences(
  userIds: readonly string[],
): Promise<(UserPresence | null)[]> {
  if (userIds.length === 0) {
    return [];
  }
  const redis = await getRedisClient();
  const raws = await redis.mGet(userIds.map(getRedisKey));
  return raws.map((raw) => parsePresence(raw));
}
