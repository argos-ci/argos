import { randomBytes } from "node:crypto";

import { UserSession } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

/**
 * Idle timeout. A session that goes unused for this long expires. Enforced
 * authoritatively in Postgres via `lastSeenAt`, which is slid forward on
 * activity.
 */
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Absolute timeout. A session is hard-killed this long after creation, no
 * matter how active it is. Never extended. Also used as the cookie max-age.
 */
export const ABSOLUTE_TIMEOUT_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Lifetime of a Redis cache entry. Postgres stays the source of truth; this is
 * only how long a cached decision is trusted before being re-validated against
 * Postgres. Keeping it short bounds how long a revoked session can survive a
 * failed cache invalidation, and — because `lastSeenAt` is refreshed only when
 * we fall back to Postgres — naturally throttles idle-timeout writes to at most
 * one per window per session.
 */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type SessionCacheEntry = {
  /** Session row id. */
  sid: string;
  userId: string;
};

export type ResolvedSession = {
  sid: string;
  userId: string;
};

function getRedisKey(tokenHash: string): string {
  return `session:${tokenHash}`;
}

/**
 * TTL for a cache entry, in seconds: the revalidation window, capped so the
 * entry never outlives the absolute expiry.
 */
function getCacheTtlSeconds(absoluteExpiryMs: number): number {
  const untilAbsolute = absoluteExpiryMs - Date.now();
  const ttlMs = Math.min(CACHE_TTL_MS, untilAbsolute);
  return Math.max(1, Math.ceil(ttlMs / 1000));
}

async function writeCache(
  tokenHash: string,
  entry: SessionCacheEntry,
  absoluteExpiryMs: number,
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(getRedisKey(tokenHash), JSON.stringify(entry), {
    expiration: { type: "EX", value: getCacheTtlSeconds(absoluteExpiryMs) },
  });
}

/**
 * Parse a cached entry, returning `null` for anything corrupt, partially
 * written, or in an older format — the caller then treats it as a cache miss
 * rather than letting a bad value throw and turn an auth check into a 500.
 */
function parseCacheEntry(raw: string): SessionCacheEntry | null {
  try {
    const value = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      typeof value.sid === "string" &&
      typeof value.userId === "string"
    ) {
      return { sid: value.sid, userId: value.userId };
    }
  } catch {
    // Fall through to treat as a cache miss.
  }
  return null;
}

function findMatch(
  userAgent: string,
  matchers: ReadonlyArray<readonly [RegExp, string]>,
): string | null {
  const match = matchers.find(([pattern]) => pattern.test(userAgent));
  return match?.[1] ?? null;
}

/**
 * Best-effort UA → human label. Cosmetic only, never a security input.
 */
export function parseDeviceLabel(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  const browser = findMatch(userAgent, [
    [/Edg\/|Edge\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/Firefox\//, "Firefox"],
    [/Chrome\//, "Chrome"],
    [/Safari\//, "Safari"],
  ]);

  const os = findMatch(userAgent, [
    [/Windows/, "Windows"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Android/, "Android"],
    [/iPhone|iPad|iOS/, "iOS"],
    [/Linux/, "Linux"],
  ]);

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

  await writeCache(
    tokenHash,
    { sid: session.id, userId: session.userId },
    new Date(expiresAt).getTime(),
  );

  return { rawToken, session };
}

/**
 * Resolve a raw session token to `{ sid, userId }`, or `null` if it is missing,
 * expired, idle, or revoked.
 *
 * A Redis hit is trusted for the short cache window. On a miss it falls back to
 * Postgres — the source of truth — filtered on
 * `revokedAt IS NULL AND expiresAt > now() AND lastSeenAt > now() - idle`
 * (mandatory: prevents resurrecting a revoked, expired, or idle session). A
 * successful fallback slides the idle window forward (`lastSeenAt`) and
 * repopulates the cache; since that only happens on a cache miss, the write is
 * throttled to at most once per cache window per session.
 */
export async function resolveSession(
  rawToken: string,
): Promise<ResolvedSession | null> {
  const tokenHash = hashToken(rawToken);
  const redis = await getRedisClient();
  const cached = await redis.get(getRedisKey(tokenHash));

  if (cached) {
    const entry = parseCacheEntry(cached);
    if (entry) {
      return entry;
    }
    // Corrupt/unrecognized entry — drop it and fall back to Postgres.
    await redis.del(getRedisKey(tokenHash));
  }

  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_TIMEOUT_MS);
  const session = await UserSession.query()
    .findOne({ tokenHash })
    .whereNull("revokedAt")
    .where("expiresAt", ">", now.toISOString())
    .where("lastSeenAt", ">", idleCutoff.toISOString());

  if (!session) {
    return null;
  }

  // Slide the idle window forward and repopulate the cache.
  await session.$query().patch({ lastSeenAt: now.toISOString() });
  await writeCache(
    tokenHash,
    { sid: session.id, userId: session.userId },
    new Date(session.expiresAt).getTime(),
  );

  return { sid: session.id, userId: session.userId };
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
 * List a user's active sessions (non-revoked, within both the idle and absolute
 * timeouts), most recently seen first. For the session-management endpoints.
 */
export async function listActiveSessions(
  userId: string,
): Promise<UserSession[]> {
  const now = Date.now();
  const idleCutoff = new Date(now - IDLE_TIMEOUT_MS);
  return UserSession.query()
    .where("userId", userId)
    .whereNull("revokedAt")
    .where("expiresAt", ">", new Date(now).toISOString())
    .where("lastSeenAt", ">", idleCutoff.toISOString())
    .orderBy("lastSeenAt", "desc");
}
