import { randomBytes } from "node:crypto";

import { UserSession } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

/**
 * Idle timeout. A session that goes unused for this long expires. Slid forward
 * on activity (throttled) and used as the Redis cache TTL.
 */
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Absolute timeout. A session is hard-killed this long after creation, no
 * matter how active it is. Never extended. Also used as the cookie max-age.
 */
export const ABSOLUTE_TIMEOUT_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Only persist `lastSeenAt` / slide the Redis TTL when the last touch is older
 * than this, to avoid a write on every request.
 */
const TOUCH_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

type SessionCacheEntry = {
  /** Session row id. */
  sid: string;
  userId: string;
  /** Absolute expiry, epoch milliseconds. Never extended. */
  exp: number;
};

export type ResolvedSession = {
  sid: string;
  userId: string;
};

function getRedisKey(tokenHash: string): string {
  return `session:${tokenHash}`;
}

/**
 * TTL for the Redis cache entry, in seconds: the idle timeout, capped so it
 * never outlives the absolute expiry.
 */
function getCacheTtlSeconds(exp: number): number {
  const untilAbsolute = exp - Date.now();
  const ttlMs = Math.min(IDLE_TIMEOUT_MS, untilAbsolute);
  return Math.max(1, Math.ceil(ttlMs / 1000));
}

async function writeCache(
  tokenHash: string,
  entry: SessionCacheEntry,
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(getRedisKey(tokenHash), JSON.stringify(entry), {
    expiration: { type: "EX", value: getCacheTtlSeconds(entry.exp) },
  });
}

/**
 * Best-effort UA → human label. Cosmetic only, never a security input.
 */
export function parseDeviceLabel(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }
  const browser =
    /Edg\//.test(userAgent) || /Edge\//.test(userAgent)
      ? "Edge"
      : /OPR\/|Opera/.test(userAgent)
        ? "Opera"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Chrome\//.test(userAgent)
            ? "Chrome"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : null;
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iOS/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (browser && os) {
    return `${browser} on ${os}`;
  }
  return browser ?? os;
}

/**
 * Create a new session for a user. Returns the raw token (to be put in the
 * cookie) and the persisted session row. The raw token is never stored — only
 * its sha256.
 */
export async function createSession(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
}): Promise<{ rawToken: string; session: UserSession }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = new Date(now + ABSOLUTE_TIMEOUT_MS).toISOString();

  const session = await UserSession.query().insertAndFetch({
    userId: input.userId,
    tokenHash,
    lastSeenAt: new Date(now).toISOString(),
    expiresAt,
    revokedAt: null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    deviceLabel: input.deviceLabel ?? null,
  });

  await writeCache(tokenHash, {
    sid: session.id,
    userId: session.userId,
    exp: new Date(expiresAt).getTime(),
  });

  return { rawToken, session };
}

/**
 * Slide the idle timeout forward, throttled. Updates `lastSeenAt` in Postgres
 * and refreshes the Redis TTL only when the last touch is stale enough.
 */
async function touchSession(
  tokenHash: string,
  entry: SessionCacheEntry,
  lastSeenAt: string,
): Promise<void> {
  const sinceTouch = Date.now() - new Date(lastSeenAt).getTime();
  if (sinceTouch < TOUCH_THROTTLE_MS) {
    return;
  }
  const now = new Date().toISOString();
  await UserSession.query().findById(entry.sid).patch({ lastSeenAt: now });
  await writeCache(tokenHash, entry);
}

/**
 * Resolve a raw session token to `{ sid, userId }`, or `null` if missing,
 * expired, or revoked. Reads Redis first, falls back to Postgres (filtered on
 * `revokedAt IS NULL AND expiresAt > now()` — mandatory to avoid resurrecting a
 * revoked session) and repopulates the cache. Touches the session (throttled).
 */
export async function resolveSession(
  rawToken: string,
): Promise<ResolvedSession | null> {
  const tokenHash = hashToken(rawToken);
  const redis = await getRedisClient();
  const cached = await redis.get(getRedisKey(tokenHash));

  if (cached) {
    const entry = JSON.parse(cached) as SessionCacheEntry;
    if (entry.exp <= Date.now()) {
      await redis.del(getRedisKey(tokenHash));
      return null;
    }
    // Refresh lastSeenAt from PG lazily only when we might need to touch.
    void touchSessionFromCache(tokenHash, entry);
    return { sid: entry.sid, userId: entry.userId };
  }

  const session = await UserSession.query()
    .findOne({ tokenHash })
    .whereNull("revokedAt")
    .where("expiresAt", ">", new Date().toISOString());

  if (!session) {
    return null;
  }

  const entry: SessionCacheEntry = {
    sid: session.id,
    userId: session.userId,
    exp: new Date(session.expiresAt).getTime(),
  };
  await writeCache(tokenHash, entry);
  await touchSession(tokenHash, entry, session.lastSeenAt);

  return { sid: entry.sid, userId: entry.userId };
}

/**
 * On a cache hit we don't have `lastSeenAt` handy. Fetch it cheaply and touch
 * if stale. Fire-and-forget; never blocks the request.
 */
async function touchSessionFromCache(
  tokenHash: string,
  entry: SessionCacheEntry,
): Promise<void> {
  try {
    const session = await UserSession.query()
      .findById(entry.sid)
      .select("lastSeenAt");
    if (session) {
      await touchSession(tokenHash, entry, session.lastSeenAt);
    }
  } catch {
    // Touch is best-effort; ignore failures.
  }
}

/**
 * Revoke a single session. Postgres UPDATE first (scoped to the owner to
 * prevent cross-user revoke), then Redis DEL. Never reverse this order.
 */
export async function revokeSession(input: {
  sessionId: string;
  userId: string;
}): Promise<void> {
  const revoked = await UserSession.query()
    .patch({ revokedAt: new Date().toISOString() })
    .where("id", input.sessionId)
    .where("userId", input.userId)
    .whereNull("revokedAt")
    .returning("tokenHash");

  const redis = await getRedisClient();
  await Promise.all(
    revoked.map((session) => redis.del(getRedisKey(session.tokenHash))),
  );
}

/**
 * Revoke a session given its raw token (used on logout, where possession of
 * the token proves ownership). Postgres UPDATE first, then Redis DEL.
 */
export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await UserSession.query()
    .patch({ revokedAt: new Date().toISOString() })
    .where("tokenHash", tokenHash)
    .whereNull("revokedAt");

  const redis = await getRedisClient();
  await redis.del(getRedisKey(tokenHash));
}

/**
 * Revoke all of a user's sessions, optionally keeping one (e.g. the current
 * one). Postgres UPDATE first, then pipelined Redis DELs.
 */
export async function revokeAllSessions(input: {
  userId: string;
  exceptSessionId?: string;
}): Promise<void> {
  const query = UserSession.query()
    .patch({ revokedAt: new Date().toISOString() })
    .where("userId", input.userId)
    .whereNull("revokedAt")
    .returning("tokenHash");

  if (input.exceptSessionId) {
    query.whereNot("id", input.exceptSessionId);
  }

  const revoked = await query;
  if (revoked.length === 0) {
    return;
  }

  const redis = await getRedisClient();
  const pipeline = redis.multi();
  for (const session of revoked) {
    pipeline.del(getRedisKey(session.tokenHash));
  }
  await pipeline.exec();
}

/**
 * List a user's active (non-revoked, non-expired) sessions, most recently seen
 * first. For the session-management endpoints.
 */
export async function listActiveSessions(
  userId: string,
): Promise<UserSession[]> {
  return UserSession.query()
    .where("userId", userId)
    .whereNull("revokedAt")
    .where("expiresAt", ">", new Date().toISOString())
    .orderBy("lastSeenAt", "desc");
}
