import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

import { getBaseCookieOptions, readCookie } from "./session-cookie";

export type CallbackProvider = "github" | "gitlab" | "google" | "saml";

/**
 * How long the user may spend on the provider's pages, installing the GitHub
 * App included, before the callback stops accepting what it brings back.
 */
const BINDING_MAX_AGE_MS = 60 * 60 * 1000;

export function getCallbackCookieName(provider: CallbackProvider): string {
  return `argos_auth_callback_${provider}`;
}

/**
 * Bind `value` (an OAuth state, a SAML auth code) to this browser in an
 * HttpOnly cookie, so the login callback accepts it only from here.
 *
 * Without it, anyone could hand a signed-in user a callback URL carrying their
 * own provider identity, and the callback would link that identity to the
 * user's account.
 */
export function bindCallbackToBrowser(
  res: Response,
  input: { provider: CallbackProvider; value: string },
): void {
  res.cookie(getCallbackCookieName(input.provider), input.value, {
    ...getBaseCookieOptions(),
    httpOnly: true,
    maxAge: BINDING_MAX_AGE_MS,
  });
}

/**
 * Whether `value` is the one bound to this browser for `provider`. The cookie is
 * cleared either way, so a binding is checked at most once.
 */
export function consumeCallbackBinding(
  req: Request,
  res: Response,
  input: { provider: CallbackProvider; value: string },
): boolean {
  const name = getCallbackCookieName(input.provider);
  const expected = readCookie(req, name);
  res.clearCookie(name, { ...getBaseCookieOptions(), httpOnly: true });
  if (!expected) {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(input.value);
  return a.length === b.length && timingSafeEqual(a, b);
}
