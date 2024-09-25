import * as authorization from "auth-header";
import type { Request } from "express";

import { Account, User } from "@/database/models/index.js";

import { verifyJWT } from "./jwt.js";

export class AuthError extends Error {}

const getTokenFromAuthHeader = (authHeader: string) => {
  const auth = authorization.parse(authHeader);
  if (auth.scheme !== "Bearer") {
    throw new AuthError(`Invalid auth scheme: ${auth.scheme || "no scheme"}`);
  }
  if (typeof auth.token !== "string" || !auth.token) {
    throw new AuthError("Invalid auth token");
  }
  return auth.token;
};

export type AuthPayload = {
  account: Account;
  user: User;
};

const getAuthPayloadFromToken = async (token: string): Promise<AuthPayload> => {
  const jwt = verifyJWT(token);
  if (!jwt) {
    throw new AuthError("Invalid JWT");
  }
  const account = await Account.query()
    .withGraphFetched("user")
    .findById(jwt.account.id);
  if (!account) {
    throw new AuthError("Account not found");
  }
  if (!account.user) {
    throw new AuthError("Account has no user");
  }
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
  return getAuthPayloadFromToken(token);
}
