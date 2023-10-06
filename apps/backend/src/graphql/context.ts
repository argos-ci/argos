import type { BaseContext } from "@apollo/server";
import type { Request } from "express";

import { createLoaders } from "./loaders.js";
import {
  AuthError,
  AuthPayload,
  getAuthPayloadFromRequest,
} from "@/auth/request.js";
import { GraphQLError } from "graphql";

export type Context = BaseContext & {
  auth: AuthPayload | null;
  loaders: ReturnType<typeof createLoaders>;
};

export async function getContext(props: { req: Request }): Promise<Context> {
  try {
    const auth = await getAuthPayloadFromRequest(props.req);
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
