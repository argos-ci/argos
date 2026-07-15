import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import {
  OAuthAccessToken,
  OAuthGrant,
  OAuthRefreshToken,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { transaction } from "@/database/transaction";

import { isOAuthScope, type OAuthScope } from "./scopes";

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_MS / 1000;

/**
 * Thrown inside the rotation transaction when a concurrent request already
 * rotated the same refresh token, so this transaction must roll back.
 */
class RefreshTokenRaceError extends Error {}

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds (the OAuth `expires_in`). */
  expiresIn: number;
  scopes: OAuthScope[];
};

/**
 * Insert a fresh access + refresh token pair for a grant within a transaction.
 */
async function insertTokenPair(
  trx: TransactionOrKnex,
  params: { grantId: string; scopes: OAuthScope[]; resource: string | null },
): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
}> {
  const accessToken = OAuthAccessToken.generateToken();
  const refreshToken = OAuthRefreshToken.generateToken();
  const now = Date.now();

  await OAuthAccessToken.query(trx).insert({
    oauthGrantId: params.grantId,
    tokenHash: hashToken(accessToken),
    scopes: params.scopes,
    resource: params.resource,
    expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
  });
  const refresh = await OAuthRefreshToken.query(trx).insert({
    oauthGrantId: params.grantId,
    tokenHash: hashToken(refreshToken),
    scopes: params.scopes,
    resource: params.resource,
    expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
  });

  return { accessToken, refreshToken, refreshTokenId: refresh.id };
}

/**
 * Issue a fresh access + refresh token pair for a grant (authorization_code).
 */
export async function issueTokens(params: {
  grantId: string;
  scopes: OAuthScope[];
  resource: string | null;
}): Promise<IssuedTokens> {
  const { accessToken, refreshToken } = await transaction((trx) =>
    insertTokenPair(trx, params),
  );
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scopes: params.scopes,
  };
}

export type RefreshResult =
  | { ok: true; tokens: IssuedTokens }
  | { ok: false; error: "invalid_grant" | "invalid_scope" };

/**
 * Rotate a refresh token: validate it, issue a new pair, and mark the old token
 * rotated. Presenting an already-rotated token is treated as reuse (theft) and
 * revokes the whole grant.
 */
export async function rotateRefreshToken(params: {
  refreshToken: string;
  clientId: string;
  requestedScopes: OAuthScope[] | null;
  resource: string | null;
}): Promise<RefreshResult> {
  const existing = await OAuthRefreshToken.query()
    .findOne({ tokenHash: hashToken(params.refreshToken) })
    .withGraphFetched("grant.client");

  if (!existing) {
    return { ok: false, error: "invalid_grant" };
  }
  invariant(existing.grant, "refresh token without a grant");
  const grant = existing.grant;
  invariant(grant.client, "grant without a client");

  // The refresh token is bound to the authenticating client.
  if (grant.client.clientId !== params.clientId) {
    return { ok: false, error: "invalid_grant" };
  }

  // Reuse detection: an already-rotated token being presented again signals
  // theft — revoke the whole grant.
  if (existing.replacedByTokenId) {
    await revokeGrant(grant.id);
    return { ok: false, error: "invalid_grant" };
  }

  if (existing.revokedAt || grant.revokedAt) {
    return { ok: false, error: "invalid_grant" };
  }
  if (new Date(existing.expiresAt) <= new Date()) {
    return { ok: false, error: "invalid_grant" };
  }

  const currentScopes = existing.scopes.filter(isOAuthScope);
  let scopes = currentScopes;
  if (params.requestedScopes && params.requestedScopes.length > 0) {
    const allowed = new Set(currentScopes);
    if (!params.requestedScopes.every((scope) => allowed.has(scope))) {
      return { ok: false, error: "invalid_scope" };
    }
    scopes = params.requestedScopes;
  }

  const resource = params.resource ?? existing.resource;

  let result: Awaited<ReturnType<typeof insertTokenPair>>;
  try {
    result = await transaction(async (trx) => {
      const pair = await insertTokenPair(trx, {
        grantId: grant.id,
        scopes,
        resource,
      });
      // Atomically claim the rotation: only the request that flips this row
      // from "live" to "rotated" wins. A concurrent rotation of the same token
      // updates 0 rows and is rolled back, so one refresh token can only ever
      // yield a single new pair (and a replay still trips reuse detection).
      const rotated = await OAuthRefreshToken.query(trx)
        .patch({
          revokedAt: new Date().toISOString(),
          replacedByTokenId: pair.refreshTokenId,
        })
        .where({ id: existing.id })
        .whereNull("replacedByTokenId")
        .whereNull("revokedAt");
      if (rotated === 0) {
        throw new RefreshTokenRaceError();
      }
      return pair;
    });
  } catch (error) {
    if (error instanceof RefreshTokenRaceError) {
      return { ok: false, error: "invalid_grant" };
    }
    throw error;
  }

  return {
    ok: true,
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      scopes,
    },
  };
}

/**
 * Revoke all live access + refresh tokens for a grant, leaving the grant itself
 * untouched. Helper behind `revokeGrant`.
 */
async function revokeGrantTokens(
  grantId: string,
  trx?: TransactionOrKnex,
): Promise<void> {
  const now = new Date().toISOString();
  await transaction(trx, async (t) => {
    await OAuthAccessToken.query(t)
      .patch({ revokedAt: now })
      .where({ oauthGrantId: grantId })
      .whereNull("revokedAt");
    await OAuthRefreshToken.query(t)
      .patch({ revokedAt: now })
      .where({ oauthGrantId: grantId })
      .whereNull("revokedAt");
  });
}

/**
 * Revoke a whole grant: flip its master switch and revoke its live tokens. Used
 * by the "revoke application" settings action and by refresh-reuse detection.
 */
export async function revokeGrant(
  grantId: string,
  trx?: TransactionOrKnex,
): Promise<void> {
  await transaction(trx, async (t) => {
    await OAuthGrant.query(t)
      .findById(grantId)
      .patch({ revokedAt: new Date().toISOString() });
    await revokeGrantTokens(grantId, t);
  });
}

export type IntrospectionResult = {
  active: boolean;
  scope?: string;
  client_id?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
};

/**
 * RFC 7662 token introspection, for resource servers (e.g. the future MCP
 * server) that validate access tokens out-of-process.
 */
export async function introspectToken(
  token: string,
): Promise<IntrospectionResult> {
  if (!OAuthAccessToken.isOAuthAccessToken(token)) {
    return { active: false };
  }
  const accessToken = await OAuthAccessToken.query()
    .findOne({ tokenHash: hashToken(token) })
    .withGraphFetched("grant.client");
  if (!accessToken?.grant?.client) {
    return { active: false };
  }
  const { grant } = accessToken;
  invariant(grant.client);
  if (accessToken.revokedAt || grant.revokedAt) {
    return { active: false };
  }
  if (new Date(accessToken.expiresAt) <= new Date()) {
    return { active: false };
  }
  return {
    active: true,
    scope: accessToken.scopes.join(" "),
    client_id: grant.client.clientId,
    token_type: "Bearer",
    exp: Math.floor(new Date(accessToken.expiresAt).getTime() / 1000),
    iat: Math.floor(new Date(accessToken.createdAt).getTime() / 1000),
    sub: grant.userId,
    ...(accessToken.resource ? { aud: accessToken.resource } : {}),
  };
}

/**
 * RFC 7009 token revocation. Revoking a refresh token also revokes the access
 * tokens it minted.
 */
export async function revokeToken(token: string): Promise<void> {
  const now = new Date().toISOString();
  if (OAuthAccessToken.isOAuthAccessToken(token)) {
    await OAuthAccessToken.query()
      .patch({ revokedAt: now })
      .where({ tokenHash: hashToken(token) });
    return;
  }
  if (OAuthRefreshToken.isOAuthRefreshToken(token)) {
    const refresh = await OAuthRefreshToken.query().findOne({
      tokenHash: hashToken(token),
    });
    if (!refresh) {
      return;
    }
    await transaction(async (trx) => {
      await OAuthRefreshToken.query(trx)
        .findById(refresh.id)
        .patch({ revokedAt: now });
      await OAuthAccessToken.query(trx)
        .patch({ revokedAt: now })
        .where({ oauthGrantId: refresh.oauthGrantId })
        .whereNull("revokedAt");
    });
  }
}
