import type { Request, Response } from "express";

import { createSession, parseDeviceLabel } from "./session";
import { setSessionCookies } from "./session-cookie";

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
  });
  setSessionCookies(res, rawToken);
}
