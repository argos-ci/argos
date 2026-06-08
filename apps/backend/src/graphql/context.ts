import type { BaseContext } from "@apollo/server";
import type { Request, Response } from "express";
import { GraphQLError } from "graphql";

import type { AuthSessionPayload } from "@/auth/payload";
import { readSessionCookie } from "@/auth/session-cookie";
import { sessionAuthFromExpressReq } from "@/auth/session-request";
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
   * invite sign-up) can create a session and set the session cookie.
   */
  req: Request;
  res: Response;
};

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
  // throws a 401, which surfaces as UNAUTHENTICATED below so the client logs
  // out.
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
  try {
    const auth = await getContextAuth(request);
    const requestLocation = extractLocationFromRequest(request);
    return {
      auth,
      requestLocation,
      loaders: createLoaders(),
      req: request,
      res: response,
    };
  } catch (error) {
    if (error instanceof HTTPError && error.statusCode === 401) {
      throw new GraphQLError("User is not authenticated", {
        originalError: error,
        extensions: {
          code: "UNAUTHENTICATED",
          http: { status: 401 },
        },
      });
    }

    throw error;
  }
}
