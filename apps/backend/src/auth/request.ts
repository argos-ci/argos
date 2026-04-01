import { invariant } from "@argos/util/invariant";
import * as authorization from "auth-header";
import type { Request } from "express";

import { Account, User, UserAccessToken } from "@/database/models";
import { hashToken } from "@/database/services/crypto";

import { boom } from "../util/error";
import { verifyJWT } from "./jwt";

const getTokenFromAuthHeader = (authHeader: string) => {
  try {
    const auth = authorization.parse(authHeader);
    if (auth.scheme !== "Bearer") {
      return null;
    }
    if (typeof auth.token !== "string" || !auth.token) {
      return null;
    }
    return auth.token;
  } catch {
    return null;
  }
};

export type AuthPayload = {
  account: Account;
  user: User;
  scope?: Account[];
};

const getAuthPayloadFromJWT = async (token: string): Promise<AuthPayload> => {
  const jwt = verifyJWT(token);
  if (!jwt) {
    throw boom(401, "Invalid JWT");
  }
  const account = await Account.query()
    .withGraphFetched("user")
    .findById(jwt.account.id);
  if (!account) {
    throw boom(401, "Invalid JWT");
  }
  invariant(account.user, "Account has no user");
  return { account, user: account.user };
};

const getAuthPayloadFromUserAccessToken = async (
  token: string,
): Promise<AuthPayload | null> => {
  const userAccessToken = await UserAccessToken.query()
    .findOne({ token: hashToken(token) })
    .withGraphFetched("[user.[account,teams],scope.account]");
  if (!userAccessToken) {
    return null;
  }

  if (
    userAccessToken.expireAt &&
    new Date(userAccessToken.expireAt) <= new Date()
  ) {
    throw boom(401, "Personal access token has expired");
  }

  const user = userAccessToken.user;
  if (!user) {
    return null;
  }
  const account = user.account;
  if (!account) {
    return null;
  }

  const userTeamIds = new Set(user.teams?.map((team) => team.id) ?? []);
  const scopedAccounts =
    userAccessToken.scope
      ?.map((scope) => scope.account)
      .filter(
        (scopeAccount): scopeAccount is Account => scopeAccount != null,
      ) ?? [];
  const scope =
    scopedAccounts.length > 0
      ? scopedAccounts.filter(
          (scopeAccount) =>
            scopeAccount.userId === userAccessToken.userId ||
            (scopeAccount.teamId !== null &&
              userTeamIds.has(scopeAccount.teamId)),
        )
      : undefined;

  // Fail closed when scope rows exist but none are actually accessible.
  if (scopedAccounts.length > 0 && (!scope || scope.length === 0)) {
    return null;
  }

  await UserAccessToken.query()
    .patch({ lastUsedAt: new Date().toISOString() })
    .findById(userAccessToken.id);

  return { account, user, ...(scope ? { scope } : {}) };
};

export async function getAuthPayloadFromRequest(
  request: Request,
): Promise<AuthPayload | null> {
  const authHeader = request.get("authorization");
  if (!authHeader) {
    return null;
  }
  const token = getTokenFromAuthHeader(authHeader);
  if (!token) {
    return null;
  }
  if (UserAccessToken.isValidUserAccessToken(token)) {
    return getAuthPayloadFromUserAccessToken(token);
  }
  return getAuthPayloadFromJWT(token);
}
