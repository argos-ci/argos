import type { IncomingMessage } from "node:http";
import type { BaseContext } from "@apollo/server";
import { captureException } from "@sentry/node";
import type { Request, Response } from "express";

import type { AuthSessionPayload } from "@/auth/payload";
import { touchPresence } from "@/auth/presence";
import { clearSessionCookies, readSessionCookie } from "@/auth/session-cookie";
import {
  safeSessionAuthFromExpressReq,
  sessionAuthFromExpressReq,
} from "@/auth/session-request";
import { HTTPError } from "@/util/error";
import {
  extractLocationFromRequest,
  type RequestLocation,
} from "@/util/request-location";

import { createLoaders } from "./loaders";

export type Context = BaseContext & {
  auth: AuthSessionPayload | null;
  requestLocation: RequestLocation | null;
  loaders: ReturnType<typeof createLoaders>;
  /**
   * The Express request/response, exposed so login mutations (email auth,
   * invite sign-up) can create a session and set the session cookie. Absent on
   * the WebSocket (subscription) transport, which has no Express response.
   */
  req?: Request;
  res?: Response;
};

/**
 * Read a single header value as a non-empty string, or `null`.
 */
function getHeaderString(request: Request, name: string): string | null {
  const value = request.headers[name];
  const str = Array.isArray(value) ? value[0] : value;
  return str && str.length > 0 ? str : null;
}

async function getContextAuth(
  request: Request,
): Promise<AuthSessionPayload | null> {
  if (process.env["NODE_ENV"] === "test") {
    const mockedAuth = (request as any).__MOCKED_AUTH__;
    if (mockedAuth) {
      return mockedAuth;
    }
  }

  // No cookie → anonymous request (allowed). A present-but-invalid cookie
  // throws a 401, which the caller turns into an anonymous request (clearing
  // the stale cookie) rather than failing the whole request.
  const rawToken = readSessionCookie(request);
  if (!rawToken) {
    return null;
  }
  return sessionAuthFromExpressReq(request);
}

export async function getContext(
  request: Request,
  response: Response,
): Promise<Context> {
  const requestLocation = extractLocationFromRequest(request);

  let auth: AuthSessionPayload | null;
  try {
    auth = await getContextAuth(request);
  } catch (error) {
    if (error instanceof HTTPError && error.statusCode === 401) {
      // The request carries a session cookie that is invalid, expired, or
      // revoked. Treat the request as anonymous and clear the stale cookies so
      // the client stops sending them — failing here would block public
      // operations like signup and signin. Resolvers that require auth still
      // throw UNAUTHENTICATED on their own, which drives the client logout.
      clearSessionCookies(response);
      auth = null;
    } else {
      throw error;
    }
  }

  if (auth) {
    // Record live presence. Best-effort and fire-and-forget — a presence
    // write must never turn a query into a 500. Timezone rides on the
    // Cloudflare `cf-timezone` header (absent locally).
    void touchPresence({
      userId: auth.user.id,
      timezone: getHeaderString(request, "cf-timezone"),
    }).catch(captureException);
  }

  return {
    auth,
    requestLocation,
    loaders: createLoaders(),
    req: request,
    res: response,
  };
}

/**
 * Build the GraphQL context for a WebSocket (subscription) connection. The
 * session cookie rides along on the upgrade request, so we authenticate from it
 * the same way the HTTP transport does. A missing or invalid session resolves
 * to an anonymous context rather than throwing — public builds can be watched
 * without a session, and each subscription resolver enforces its own access.
 */
export async function getWebSocketContext(
  request: IncomingMessage,
): Promise<Context> {
  const auth = await safeSessionAuthFromExpressReq(request);
  return {
    auth,
    requestLocation: null,
    loaders: createLoaders(),
  };
}
