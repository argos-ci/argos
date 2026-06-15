import type { Request, Response } from "express";

import config from "@/config";

import { ABSOLUTE_TIMEOUT_MS } from "./session";

/**
 * The real credential: the raw session token. HttpOnly — never readable by JS.
 */
export const SESSION_COOKIE_NAME = "argos_session";

/**
 * Zero-privilege render hint so the app and the marketing site can show
 * "Dashboard" vs "Log in". Not HttpOnly. Never used as a security input — it is
 * set and cleared together with the session cookie.
 */
export const LOGGED_IN_COOKIE_NAME = "argos_logged_in";

function getBaseCookieOptions() {
  const domain = config.get("session.domain") || undefined;
  return {
    domain,
    secure: config.get("server.secure"),
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Set both session cookies. Call on login and whenever the session is rotated.
 */
export function setSessionCookies(res: Response, rawToken: string): void {
  const base = getBaseCookieOptions();
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    ...base,
    httpOnly: true,
    maxAge: ABSOLUTE_TIMEOUT_MS,
  });
  res.cookie(LOGGED_IN_COOKIE_NAME, "1", {
    ...base,
    httpOnly: false,
    maxAge: ABSOLUTE_TIMEOUT_MS,
  });
}

/**
 * Clear both session cookies. Call on logout.
 */
export function clearSessionCookies(res: Response): void {
  const base = getBaseCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, { ...base, httpOnly: true });
  res.clearCookie(LOGGED_IN_COOKIE_NAME, { ...base, httpOnly: false });
}

/**
 * Read the raw session token from the request cookies. Returns `null` when the
 * cookie is absent. We parse the header directly (no cookie-parser middleware).
 */
export function readSessionCookie(
  req: Pick<Request, "headers">,
): string | null {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    if (trimmed.slice(0, eq) === SESSION_COOKIE_NAME) {
      return decodeURIComponent(trimmed.slice(eq + 1)) || null;
    }
  }
  return null;
}
