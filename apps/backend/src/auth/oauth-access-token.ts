import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { Request } from "express";

import { waitUntil } from "@/api/request-context";
import { Account, OAuthAccessToken, OAuthGrant } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { getApiResourceUrl } from "@/oauth/metadata";

import { boom } from "../util/error";
import type { AuthOAuthPayload } from "./payload";

/**
 * Request-scoped marker listing the resource identifiers (RFC 8707 audiences)
 * accepted by the surface handling the request. Symbol-keyed so it can only be
 * set by our own middleware, never by external input. Absent on public REST
 * API requests, which keep the strict default audience.
 */
const kAcceptedOAuthResources = Symbol("acceptedOAuthResources");

export function markAcceptedOAuthResources(
  request: Request,
  resources: readonly string[],
): void {
  (request as MarkedRequest)[kAcceptedOAuthResources] = resources;
}

export function getAcceptedOAuthResources(
  request: Request,
): readonly string[] | undefined {
  return (request as MarkedRequest)[kAcceptedOAuthResources];
}

type MarkedRequest = Request & {
  [kAcceptedOAuthResources]?: readonly string[];
};

/**
 * Resolve an OAuth access token to an auth payload.
 *
 * Like personal access tokens, the token's account scope is re-validated
 * against the user's *current* team membership on every request, so losing
 * access to a team silently narrows (or invalidates) the token.
 */
export async function getAuthPayloadFromOAuthAccessToken(
  token: string,
  options?: { acceptedResources?: readonly string[] | undefined },
): Promise<AuthOAuthPayload> {
  if (!OAuthAccessToken.isOAuthAccessToken(token)) {
    throw boom(400, "Invalid OAuth access token");
  }

  const accessToken = await OAuthAccessToken.query()
    .findOne({ tokenHash: hashToken(token) })
    .withGraphFetched(
      "grant.[user.[account,teams],grantAccounts.account,client]",
    );

  if (!accessToken) {
    throw boom(401, "Access token not found");
  }
  if (accessToken.revokedAt) {
    throw boom(401, "Access token has been revoked");
  }
  if (new Date(accessToken.expiresAt) <= new Date()) {
    throw boom(401, "Access token has expired");
  }
  // Audience binding (RFC 8707): a token issued for another resource must not
  // be accepted here. The REST API only accepts its own audience; the MCP
  // server marks its requests as also accepting the MCP audience. Tokens with
  // no bound resource are unscoped and accepted everywhere.
  const acceptedResources = options?.acceptedResources ?? [getApiResourceUrl()];
  if (
    accessToken.resource &&
    !acceptedResources.includes(accessToken.resource)
  ) {
    throw boom(401, "Access token was not issued for this resource");
  }

  const { grant } = accessToken;
  invariant(grant);
  if (grant.revokedAt) {
    throw boom(401, "Authorization has been revoked");
  }

  const { user, grantAccounts, client } = grant;
  invariant(user?.account);
  invariant(user.teams);
  invariant(grantAccounts);
  invariant(client);

  const userTeamIds = new Set(user.teams.map((team) => team.id));
  const scopeAccounts = grantAccounts.reduce<Account[]>((accounts, entry) => {
    invariant(entry.account);
    switch (entry.account.type) {
      case "team": {
        invariant(entry.account.teamId);
        if (userTeamIds.has(entry.account.teamId)) {
          accounts.push(entry.account);
        }
        return accounts;
      }
      case "user": {
        invariant(entry.account.userId);
        if (entry.account.userId === grant.userId) {
          accounts.push(entry.account);
        }
        return accounts;
      }
      default:
        assertNever(entry.account.type);
    }
  }, []);

  if (scopeAccounts.length === 0) {
    throw boom(
      401,
      "This authorization has no valid scope, probably because you are no longer in the granted organization. Re-authorize the application.",
    );
  }

  // Bookkeeping — see the note in `getAuthPayloadFromUserAccessToken`.
  const now = new Date().toISOString();
  await waitUntil(
    Promise.all([
      OAuthAccessToken.query()
        .patch({ lastUsedAt: now })
        .findById(accessToken.id),
      OAuthGrant.query().patch({ lastUsedAt: now }).findById(grant.id),
    ]),
  );

  return {
    type: "oauth",
    account: user.account,
    user,
    scope: scopeAccounts,
    oauthScopes: accessToken.scopes,
    clientId: client.clientId,
    grantId: grant.id,
  };
}
