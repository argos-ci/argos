import type { BaseContext } from "@apollo/server";
import type { Request } from "express";
import { GraphQLError } from "graphql";

import { AuthPayload, getAuthPayloadFromRequest } from "@/auth/request";
import { HTTPError } from "@/util/error";
import {
  extractLocationFromRequest,
  type RequestLocation,
} from "@/util/request-location";

import { createLoaders } from "./loaders";

export type Context = BaseContext & {
  auth: AuthPayload | null;
  requestLocation: RequestLocation | null;
  loaders: ReturnType<typeof createLoaders>;
};

async function getContextAuth(request: Request): Promise<AuthPayload | null> {
  if (process.env["NODE_ENV"] === "test") {
    return (request as any).__MOCKED_AUTH__ ?? null;
  }

  return getAuthPayloadFromRequest(request);
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
