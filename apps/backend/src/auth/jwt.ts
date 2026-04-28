import { invariant } from "@argos/util/invariant";
import type { Request } from "express";
import jwt from "jsonwebtoken";

import config from "@/config";
import { Account } from "@/database/models";
import { boom } from "@/util/error";

import {
  getAuthHeaderFromExpressReq,
  parseBearerFromHeader,
} from "./auth-header";
import type { AuthJWTPayload } from "./payload";

export const JWT_VERSION = 2;

type JWTData = {
  version: typeof JWT_VERSION;
  account: {
    id: string;
    slug: string;
    name: string | null;
  };
};

export function createJWT(data: JWTData) {
  return jwt.sign(data, config.get("session.secret"), {
    expiresIn: "60d",
    encoding: "utf-8",
  });
}

export function verifyJWT(token: string): JWTData | null {
  try {
    const payload = jwt.verify(token, config.get("session.secret"));
    if (typeof payload !== "object" || payload["version"] !== JWT_VERSION) {
      return null;
    }
    return payload as JWTData;
  } catch {
    return null;
  }
}

export async function getAuthPayloadFromJWT(
  token: string,
): Promise<AuthJWTPayload> {
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
  return { type: "jwt", account, user: account.user };
}

export async function jwtAuthFromExpressReq(req: Request) {
  const authHeader = getAuthHeaderFromExpressReq(req);
  const bearer = parseBearerFromHeader(authHeader);
  return getAuthPayloadFromJWT(bearer);
}

export async function safeJwtAuthFromExpressReq(req: Request) {
  try {
    return await jwtAuthFromExpressReq(req);
  } catch {
    return null;
  }
}
