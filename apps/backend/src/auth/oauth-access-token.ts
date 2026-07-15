import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { waitUntil } from "@/api/request-context";
import { Account, OAuthAccessToken, OAuthGrant } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { getApiResourceUrl } from "@/oauth/metadata";

import { boom } from "../util/error";
import type { AuthOAuthPayload } from "./payload";

/**
 * Resolve an OAuth access token to an auth payload.
 *
 * Like personal access tokens, the token's account scope is re-validated
 * against the user's *current* team membership on every request, so losing
 * access to a team silently narrows (or invalidates) the token.
 */
export async function getAuthPayloadFromOAuthAccessToken(
  token: string,
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
  // Audience binding (RFC 8707): a token issued for another resource server
  // (e.g. a future MCP server) must not be accepted by the REST API. Tokens
  // with no bound resource are unscoped and accepted everywhere.
  if (accessToken.resource && accessToken.resource !== getApiResourceUrl()) {
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
