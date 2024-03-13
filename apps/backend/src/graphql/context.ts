import type { BaseContext } from "@apollo/server";
import type { Request } from "express";
import { GraphQLError } from "graphql";

import {
  AuthError,
  AuthPayload,
  getAuthPayloadFromRequest,
} from "@/auth/request.js";

import { createLoaders } from "./loaders.js";

export type Context = BaseContext & {
  auth: AuthPayload | null;
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
    return { auth, loaders: createLoaders() };
  } catch (error) {
    if (error instanceof AuthError) {
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
