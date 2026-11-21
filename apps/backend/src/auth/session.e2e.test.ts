import { beforeEach, describe, expect, test } from "vitest";

import { UserSession } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { getRedisClient } from "@/util/redis/client";
import { setupRedis } from "@/util/redis/testing";

import {
  createSession,
  listActiveSessions,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  revokeSessionByToken,
} from "./session";

setupRedis();

describe("session service", () => {
  let userId: string;

  beforeEach(async () => {
    await setupDatabase();
    const user = await factory.User.create();
    userId = user.id;
  });

  test("creates a session and resolves it from the cache", async () => {
    const { rawToken, session } = await createSession({
      userId,
      method: "email",
    });
    const resolved = await resolveSession(rawToken);
    expect(resolved).toEqual({ sid: session.id, userId, samlTeamId: null });
  });

  test("falls back to Postgres on a cache miss and repopulates", async () => {
    const team = await factory.Team.create();
    const { rawToken, session } = await createSession({
      userId,
      method: "saml",
      samlTeamId: team.id,
    });

    // Drop the hot-path cache to force the Postgres fallback.
    const redis = await getRedisClient();
    await redis.flushDb();

    const resolved = await resolveSession(rawToken);
    expect(resolved).toEqual({ sid: session.id, userId, samlTeamId: team.id });

    // The fallback should have repopulated the cache.
    const cached = await redis.get(`session:${hashToken(rawToken)}`);
    expect(cached).not.toBeNull();
  });

  test("rejects an unknown token", async () => {
    expect(await resolveSession("not-a-real-token")).toBeNull();
  });

  test("treats a corrupt cache entry as a miss and falls back to Postgres", async () => {
    const { rawToken, session } = await createSession({
      userId,
      method: "email",
    });

    // Simulate a corrupt / partially-written / old-format cache entry.
    const redis = await getRedisClient();
    await redis.set(`session:${hashToken(rawToken)}`, "}not json{");

    const resolved = await resolveSession(rawToken);
    expect(resolved).toEqual({ sid: session.id, userId, samlTeamId: null });
  });

  test("rereads an entry cached without samlTeamId from Postgres", async () => {
    const team = await factory.Team.create();
    const { rawToken, session } = await createSession({
      userId,
      method: "saml",
      samlTeamId: team.id,
    });

    // Written by a server that predates the field: reading it as "no SAML
    // login" would lock the session out of its team until the entry expires.
    const redis = await getRedisClient();
    await redis.set(
      `session:${hashToken(rawToken)}`,
      JSON.stringify({ sid: session.id, userId }),
    );

    const resolved = await resolveSession(rawToken);
    expect(resolved).toEqual({ sid: session.id, userId, samlTeamId: team.id });
  });

  test("revokes a session and never resurrects it from Postgres", async () => {
    const { rawToken, session } = await createSession({
      userId,
      method: "email",
    });
    await revokeSession({ sessionId: session.id, userId });

    expect(await resolveSession(rawToken)).toBeNull();

    // Even with an empty cache (Postgres path), a revoked session stays dead.
    const redis = await getRedisClient();
    await redis.flushDb();
    expect(await resolveSession(rawToken)).toBeNull();
  });

  test("scopes revocation to the owner", async () => {
    const { rawToken, session } = await createSession({
      userId,
      method: "email",
    });
    const other = await factory.User.create();

    // Another user cannot revoke this session.
    await revokeSession({ sessionId: session.id, userId: other.id });
    expect(await resolveSession(rawToken)).not.toBeNull();
  });

  test("revokes by raw token (logout)", async () => {
    const { rawToken } = await createSession({ userId, method: "email" });
    await revokeSessionByToken(rawToken);
    expect(await resolveSession(rawToken)).toBeNull();
  });

  test("rejects a session past its absolute expiry", async () => {
    const rawToken = "expired-token";
    await UserSession.query().insert({
      userId,
      tokenHash: hashToken(rawToken),
      lastSeenAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      revokedAt: null,
    });
    expect(await resolveSession(rawToken)).toBeNull();
  });

  test("rejects a session past its idle timeout", async () => {
    const rawToken = "idle-token";
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await UserSession.query().insert({
      userId,
      tokenHash: hashToken(rawToken),
      // Idle for longer than the 7d idle window, but still within absolute.
      lastSeenAt: eightDaysAgo,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
    });
    expect(await resolveSession(rawToken)).toBeNull();
  });

  test("lists active sessions and excludes revoked ones", async () => {
    const a = await createSession({ userId, method: "email" });
    const b = await createSession({ userId, method: "email" });
    await revokeSession({ sessionId: b.session.id, userId });

    const active = await listActiveSessions(userId);
    expect(active.map((session) => session.id)).toEqual([a.session.id]);
  });

  test("revoke-all keeps the excepted session", async () => {
    const keep = await createSession({ userId, method: "email" });
    const drop = await createSession({ userId, method: "email" });

    await revokeAllSessions({ userId, exceptSessionId: keep.session.id });

    expect(await resolveSession(keep.rawToken)).not.toBeNull();
    expect(await resolveSession(drop.rawToken)).toBeNull();
  });
});
