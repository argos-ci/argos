import { invariant } from "@argos/util/invariant";
import type { Request } from "express";

import { Account } from "@/database/models";
import { boom } from "@/util/error";

import type { AuthSessionPayload } from "./payload";
import { resolveSession } from "./session";
import { readSessionCookie } from "./session-cookie";

/**
 * Resolve the auth payload for a web-app request from its session cookie.
 * Throws a 401 if the cookie is missing, invalid, expired, or revoked. This is
 * the cookie-based counterpart of the Bearer-token auth used by the API.
 */
export async function sessionAuthFromExpressReq(
  req: Pick<Request, "headers">,
): Promise<AuthSessionPayload> {
  const rawToken = readSessionCookie(req);
  if (!rawToken) {
    throw boom(401, "Missing session");
  }

  const resolved = await resolveSession(rawToken);
  if (!resolved) {
    throw boom(401, "Invalid session");
  }

  const account = await Account.query()
    .withGraphFetched("user")
    .findOne({ userId: resolved.userId });

  if (!account) {
    throw boom(401, "Invalid session");
  }

  invariant(account.user, "Account has no user");
  return {
    type: "session",
    account,
    user: account.user,
    sessionId: resolved.sid,
  };
}

/**
 * Like {@link sessionAuthFromExpressReq} but returns `null` instead of throwing
 * when there is no valid session.
 */
export async function safeSessionAuthFromExpressReq(
  req: Pick<Request, "headers">,
): Promise<AuthSessionPayload | null> {
  try {
    return await sessionAuthFromExpressReq(req);
  } catch {
    return null;
  }
}
