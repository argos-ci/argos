import * as authorization from "auth-header";
import type { Request } from "express";

import { boom } from "@/util/error";

function parseAuthHeader(authHeader: string) {
  try {
    return authorization.parse(authHeader);
  } catch {
    const httpError = boom(400, `Invalid authorization header`);
    httpError.cause = httpError;
    throw httpError;
  }
}

/**
 * Extract the bearer token from an Authorization header.
 */
export function parseBearerFromHeader(authHeader: string) {
  const authorization = parseAuthHeader(authHeader);

  if (authorization.scheme !== "Bearer") {
    throw boom(
      400,
      `Invalid authorization header scheme "${authorization.scheme}", please use "Bearer"`,
    );
  }

  if (typeof authorization.token !== "string") {
    throw boom(400, `Invalid authorization header, no valid Bearer found`);
  }

  return authorization.token;
}

/**
 * Extract the bearer token from an Authorization header and return `null`
 * instead of throwing when the header is invalid.
 */
export function safeParseBearerFromHeader(authHeader: string) {
  try {
    return parseBearerFromHeader(authHeader);
  } catch {
    return null;
  }
}

/**
 * Read the Authorization header from an Express request.
 */
export function getAuthHeaderFromExpressReq(request: Request) {
  const authHeader = request.get("authorization");

  if (!authHeader) {
    throw boom(401, `Authorization header is missing`);
  }

  return authHeader;
}
