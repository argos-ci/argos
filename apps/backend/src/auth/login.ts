import type { Request, Response } from "express";

import { createSession, parseDeviceLabel } from "./session";
import { setSessionCookies } from "./session-cookie";

/**
 * Read a single header value as a non-empty string, or `null`.
 */
function getHeaderString(req: Request, name: string): string | null {
  const value = req.headers[name];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.length > 0 ? str : null;
}

/**
 * Start a new authenticated session for a user: create the server-side session
 * row and set the session cookies on the response. Used by every login entry
 * point (OAuth, SAML, email auth, invite sign-up).
 */
export async function startSession(
  req: Request,
  res: Response,
  userId: string,
): Promise<void> {
  const userAgent = req.get("user-agent") ?? null;
  const { rawToken } = await createSession({
    userId,
    ip: req.ip ?? null,
    userAgent,
    deviceLabel: parseDeviceLabel(userAgent),
    // Approximate geolocation from Cloudflare geo headers (best-effort).
    city: getHeaderString(req, "cf-ipcity"),
    region: getHeaderString(req, "cf-region-code"),
    country: getHeaderString(req, "cf-ipcountry"),
  });
  setSessionCookies(res, rawToken);
}
