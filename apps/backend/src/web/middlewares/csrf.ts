import type { RequestHandler } from "express";

import { readSessionCookie } from "@/auth/session-cookie";
import { boom } from "@/util/error";

const CSRF_HEADER = "x-argos-csrf";

/**
 * Require a non-empty `X-Argos-CSRF` header on cookie-authenticated requests.
 *
 * A cross-site page can make the browser send our `SameSite=Lax` session cookie
 * on top-level navigations and simple requests, but it cannot set a custom
 * header without a CORS preflight that we never grant. Requiring this header
 * therefore blocks CSRF. Requests without a session cookie (e.g. Bearer-token
 * API calls) are not cookie-authenticated and bypass the check.
 */
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (readSessionCookie(req) === null) {
    next();
    return;
  }
  if (!req.get(CSRF_HEADER)) {
    next(boom(403, "Missing CSRF header"));
    return;
  }
  next();
};
