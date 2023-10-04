/* eslint-disable @typescript-eslint/no-namespace */
import * as authorization from "auth-header";
import type { Request, RequestHandler } from "express";

import { Account, User } from "@/database/models/index.js";

import { verifyJWT } from "../jwt.js";
import { asyncHandler } from "../util.js";

declare global {
  namespace Express {
    interface Request {
      token?: string | null;
      auth?: {
        account: Account;
        user: User;
      } | null;
    }
  }
}

const parseAuthBearerToken = (req: Request) => {
  try {
    const header = req.get("authorization");
    if (!header) return null;
    const auth = authorization.parse(header);
    if (!auth) return null;
    if (auth.scheme !== "Bearer") return null;
    if (typeof auth.token !== "string") return null;
    return auth.token as string;
  } catch {
    return null;
  }
};

const bearerToken: RequestHandler = (req, _res, next) => {
  const token = parseAuthBearerToken(req);
  req.token = token ?? null;
  next();
};

const getAccountFromToken = async (
  token: string | null,
): Promise<Account | null> => {
  if (!token) return null;
  const jwt = verifyJWT(token);
  if (!jwt) return null;
  const account = await Account.query()
    .withGraphFetched("user")
    .findById(jwt.account.id);
  return account ?? null;
};

const loggedUser = asyncHandler(async (req, _res, next) => {
  const account = await getAccountFromToken(req.token ?? null);
  req.auth = account?.user ? { account, user: account?.user } : null;
  next();
});

export const auth = [bearerToken, loggedUser];
