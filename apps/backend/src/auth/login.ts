import type { Request, Response } from "express";

import { hasAutoInviteForUser } from "@/database/services/team-domain";

import {
  createSession,
  parseDeviceLabel,
  type SessionAuthMethod,
} from "./session";
import { setSessionCookies } from "./session-cookie";

/** What every login entry point hands back to the client. */
export type AuthPayload = {
  creation: boolean;
  hasAutoInvite: boolean;
};

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
 * row, recording how the user got in, and set the session cookies on the
 * response. Used by every login entry point (OAuth, SAML, email auth, invite
 * sign-up).
 */
export async function startSession(
  req: Request,
  res: Response,
  input: { userId: string } & SessionAuthMethod,
): Promise<void> {
  const userAgent = req.get("user-agent") ?? null;
  const { rawToken } = await createSession({
    ...input,
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

/**
 * Finish a login: work out where to send the user, and open the session.
 *
 * Every entry point needs the same steps in the same order, and when each
 * wrote them out for itself they drifted — the auto-invite lookup was gated
 * three different ways across OAuth, email and passkey, with nothing forcing
 * them to agree. Owning the sequence here is what keeps a new login method from
 * having to rediscover the rules by reading the others.
 */
export async function completeLogin(
  input: {
    req: Request;
    res: Response;
    userId: string;
    /** Whether this login created the account. */
    creation: boolean;
  } & SessionAuthMethod,
): Promise<AuthPayload> {
  const { req, res, userId, creation } = input;

  const hasAutoInvite = creation
    ? await hasAutoInviteForUser({ userId })
    : false;

  await startSession(req, res, input);

  return { creation, hasAutoInvite };
}
