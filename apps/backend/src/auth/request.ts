import { invariant } from "@argos/util/invariant";
import * as authorization from "auth-header";
import type { Request } from "express";

import { Account, User } from "@/database/models/index";
import { boom } from "@/util/error";

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
};

const getAuthPayloadFromToken = async (token: string): Promise<AuthPayload> => {
  const jwt = verifyJWT(token);
  if (!jwt) {
    throw boom(401, "Invalid JWT");
  }
  const account = await Account.query()
    .withGraphFetched("user")
    .findById(jwt.account.id);
  if (!account) {
    throw boom(401, "Account not found");
  }
  invariant(account.user, "Account has no user");
  return { account, user: account.user };
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
  return getAuthPayloadFromToken(token);
}
