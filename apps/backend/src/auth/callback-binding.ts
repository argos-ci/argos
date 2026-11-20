import { randomBytes } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { z } from "zod";

import config from "@/config";
import { safeCompare } from "@/database/services/crypto";
import { boom } from "@/util/error";

import { getBaseCookieOptions, readCookie } from "./session-cookie";

export const OAUTH_PROVIDERS = ["github", "gitlab", "google"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

type CallbackProvider = OAuthProvider | "saml";

/**
 * How long the user may spend on the provider's pages, installing the GitHub
 * App included, before the callback stops accepting what it brings back.
 */
const STATE_MAX_AGE_MS = 60 * 60 * 1000;

const StateBodySchema = z.object({ state: z.string() });

export const EXPIRED_LOGIN_MESSAGE =
  "This login has expired or was started in another browser. Try again.";

/**
 * The `redirect_uri` of an authorization request. Redeeming the code must send
 * the same one, byte for byte.
 */
export function getCallbackUrl(provider: OAuthProvider): string {
  return new URL(
    `/auth/${provider}/callback`,
    config.get("server.url"),
  ).toString();
}

export function getCallbackCookieName(provider: CallbackProvider): string {
  return `argos_auth_callback_${provider}`;
}

function getCookieOptions() {
  return { ...getBaseCookieOptions(), path: "/auth", httpOnly: true };
}

/**
 * Issue the `state` a login callback must bring back, bound to this browser in
 * an HttpOnly cookie. The callback page reads `redirect` back from it, so it is
 * base64-encoded JSON.
 */
export function issueCallbackState(
  res: Response,
  input: { provider: CallbackProvider; redirect: string },
): string {
  const nonce = randomBytes(32).toString("base64url");
  const state = Buffer.from(
    JSON.stringify({ nonce, redirect: input.redirect }),
  ).toString("base64");
  res.cookie(getCallbackCookieName(input.provider), state, {
    ...getCookieOptions(),
    maxAge: STATE_MAX_AGE_MS,
  });
  return state;
}

/**
 * Reject a login callback whose `state` is not the one issued to this browser,
 * before anything is redeemed. Without it, anyone could hand a signed-in user a
 * callback URL carrying their own provider identity, and the callback would
 * link that identity to the user's account.
 *
 * The cookie is cleared either way, so a state is checked at most once.
 */
export function requireCallbackState(
  provider: CallbackProvider,
): RequestHandler {
  return (req, res, next) => {
    const name = getCallbackCookieName(provider);
    const expected = readCookie(req, name);
    res.clearCookie(name, getCookieOptions());
    const body = StateBodySchema.safeParse(req.body);
    if (!expected || !body.success || !safeCompare(expected, body.data.state)) {
      next(boom(401, EXPIRED_LOGIN_MESSAGE));
      return;
    }
    next();
  };
}
