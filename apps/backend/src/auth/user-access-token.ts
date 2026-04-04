import { invariant } from "@argos/util/invariant";

import { Account, UserAccessToken } from "@/database/models";
import { hashToken } from "@/database/services/crypto";

import { boom } from "../util/error";
import type { AuthPATPayload } from "./payload";

/**
 * Generate a auth payload from a user access token.
 */
export async function getAuthPayloadFromUserAccessToken(
  token: string,
): Promise<AuthPATPayload> {
  if (!UserAccessToken.isValidUserAccessToken(token)) {
    throw boom(400, "Invalid user access token");
  }

  const userAccessToken = await UserAccessToken.query()
    .findOne({ token: hashToken(token) })
    .withGraphFetched("[user.[account,teams],scope.account]");

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
  invariant(user.teams);

  const userTeamIds = new Set(user.teams.map((team) => team.id));
  const scopeAccounts = scope.reduce<Account[]>((accounts, entry) => {
    invariant(entry.account);
    if (entry.account.userId) {
      if (entry.account.userId === userAccessToken.userId) {
        accounts.push(entry.account);
      }
      return accounts;
    }
    if (entry.account.teamId) {
      if (userTeamIds.has(entry.account.teamId)) {
        accounts.push(entry.account);
      }
      return accounts;
    }
    throw new Error(`Invalid account type (id: ${entry.account.id})`);
  }, []);

  if (scopeAccounts.length === 0) {
    throw boom(
      401,
      "This token has no valid scope, probably because you are not anymore in the team that was in the scope, please generate a new one.",
    );
  }

  await UserAccessToken.query()
    .patch({ lastUsedAt: new Date().toISOString() })
    .findById(userAccessToken.id);

  return { type: "pat", account: user.account, user, scope: scopeAccounts };
}
