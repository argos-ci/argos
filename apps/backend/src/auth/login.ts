import type { Request, Response } from "express";

import type { TeamUser } from "@/database/models";
import { markUserLastAuthMethod } from "@/database/services/account";
import { hasAutoInviteForUser } from "@/database/services/team-domain";

import { createSession, parseDeviceLabel } from "./session";
import { setSessionCookies } from "./session-cookie";

/** How a user got in. Recorded per team membership, so SAML enforcement can
 * tell whether the current session satisfies it. */
export type AuthMethod = (typeof TeamUser.authMethods)[number];

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

/**
 * Finish a login: record how the user got in, work out where to send them, and
 * open the session.
 *
 * Every entry point needs the same four steps in the same order, and when each
 * wrote them out for itself they drifted — the auto-invite lookup was gated
 * three different ways across OAuth, email and passkey, with nothing forcing
 * them to agree. Owning the sequence here is what keeps a new login method from
 * having to rediscover the rules by reading the other three.
 *
 * `alreadySignedIn` is the OAuth case of linking a provider to a session that
 * already exists: that is not a signup, so it never triggers the auto-invite
 * detour however new the account row looks.
 */
export async function completeLogin(input: {
  req: Request;
  res: Response;
  userId: string;
  method: AuthMethod;
  /** Whether this login created the account. */
  creation: boolean;
  /** Whether the caller already had a session (OAuth account linking). */
  alreadySignedIn?: boolean;
}): Promise<AuthPayload> {
  const { req, res, userId, method, creation } = input;
  const isSignup = creation && !input.alreadySignedIn;

  const hasAutoInvite = isSignup
    ? await hasAutoInviteForUser({ userId })
    : false;

  // Skipped when linking a provider to an existing session: the method that
  // opened that session is still the one that authenticated it.
  if (!input.alreadySignedIn) {
    await markUserLastAuthMethod({ userId, method });
  }

  await startSession(req, res, userId);

  return { creation, hasAutoInvite };
}
