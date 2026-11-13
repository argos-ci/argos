import { invariant } from "@argos/util/invariant";

import { waitUntil } from "@/api/request-context";
import { UserAccessToken } from "@/database/models";
import { hashToken } from "@/database/services/crypto";

import { boom } from "../util/error";
import type { AuthPATPayload } from "./payload";
import { resolveTokenScope } from "./token-scope";

/**
 * Generate a auth payload from a user access token.
 */
export async function getAuthPayloadFromUserAccessToken(
  token: string,
  options?: { trackUsage?: boolean | undefined },
): Promise<AuthPATPayload> {
  if (!UserAccessToken.isValidUserAccessToken(token)) {
    throw boom(400, "Invalid user access token");
  }

  const userAccessToken = await UserAccessToken.query()
    .findOne({ token: hashToken(token) })
    .withGraphFetched("[user.[account,teams],scope.account.teamSamlConfig]");

  if (!userAccessToken) {
    throw boom(401, "Access token not found");
  }

  if (
    userAccessToken.expireAt &&
    new Date(userAccessToken.expireAt) <= new Date()
  ) {
    throw boom(401, "Personal access token has expired");
  }

  const { user, scope } = userAccessToken;
  invariant(scope);
  invariant(user?.account);

  const tokenScope = await resolveTokenScope(user, scope);

  if (
    tokenScope.scope.length === 0 &&
    tokenScope.samlRequiredScope.length === 0
  ) {
    throw boom(
      401,
      "This token has no valid scope, probably because you are not anymore in the team that was in the scope, please generate a new one.",
    );
  }

  // Refreshing `lastUsedAt` is bookkeeping, not part of the auth decision, so
  // don't make the request wait on it: within an API request it runs in the
  // background (awaited before the response is flushed), and elsewhere it runs
  // directly. Skipped when the caller already recorded usage (the MCP loopback
  // re-auth).
  if (options?.trackUsage !== false) {
    await waitUntil(
      UserAccessToken.query()
        .patch({ lastUsedAt: new Date().toISOString() })
        .findById(userAccessToken.id),
    );
  }

  return {
    type: "pat",
    account: user.account,
    user,
    ...tokenScope,
    tokenId: userAccessToken.id,
  };
}
