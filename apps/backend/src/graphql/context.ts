import type { BaseContext } from "@apollo/server";
import type { Request } from "express";
import { GraphQLError } from "graphql";

import { safeParseBearerFromHeader } from "@/auth/auth-header";
import { getAuthPayloadFromJWT } from "@/auth/jwt";
import type { AuthJWTPayload } from "@/auth/payload";
import { HTTPError } from "@/util/error";
import {
  extractLocationFromRequest,
  type RequestLocation,
} from "@/util/request-location";

import { createLoaders } from "./loaders";

export type Context = BaseContext & {
  auth: AuthJWTPayload | null;
  requestLocation: RequestLocation | null;
  loaders: ReturnType<typeof createLoaders>;
};

async function getContextAuth(
  request: Request,
): Promise<AuthJWTPayload | null> {
  if (process.env["NODE_ENV"] === "test") {
    const mockedAuth = (request as any).__MOCKED_AUTH__;
    if (mockedAuth) {
      return mockedAuth;
    }
  }

  const authHeader = request.get("authorization");
  if (!authHeader) {
    return null;
  }
  const bearer = safeParseBearerFromHeader(authHeader);
  if (!bearer) {
    return null;
  }
  return getAuthPayloadFromJWT(bearer);
}

export async function getContext(request: Request): Promise<Context> {
  try {
    const auth = await getContextAuth(request);
    const requestLocation = extractLocationFromRequest(request);
    return { auth, requestLocation, loaders: createLoaders() };
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
