import type { RequestHandler } from "express";
import { z } from "zod";

import config from "@/config";

/**
 * Takes a route handling function and returns
 * a function that wraps it in a `try/catch`. Caught
 * exceptions are forwarded to the `next` handler.
 */
export const asyncHandler =
  (requestHandler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    try {
      Promise.resolve(requestHandler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };

export const subdomain =
  (requestHandler: RequestHandler, subdomain: string): RequestHandler =>
  (...args) => {
    const req = args[0];
    const next = args[2];

    const matchSubdomain = (subdomains: string[]) => {
      return subdomains[0] === subdomain;
    };

    const getHostHeaderSubdomains = (host: string | undefined) => {
      return host?.split(".") || [];
    };

    if (
      matchSubdomain(req.subdomains) ||
      matchSubdomain(getHostHeaderSubdomains(req.headers.host)) ||
      config.get("server.wildcardDomains").includes(req.hostname)
    ) {
      requestHandler(...args);
      return;
    }

    next();
  };

/**
 * A same-origin path to land on after login. Resolved with the URL parser
 * rather than matched as a string: `//evil.example` and `/\evil.example` both
 * start with a slash and both leave the origin.
 */
function getSafeRedirect(redirect: string | undefined) {
  if (!redirect) {
    return "/";
  }
  const origin = new URL(config.get("server.url")).origin;
  let url: URL;
  try {
    url = new URL(redirect, origin);
  } catch {
    return "/";
  }
  if (url.origin !== origin) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getFirstString(input: string | string[] | undefined) {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input[0];
  }
  return undefined;
}

const LoginQuerySchema = z.object({
  r: z.union([z.string(), z.array(z.string())]).optional(),
});

/**
 * Where to land after a login, from the `r` query param of the route that
 * starts it.
 */
export function getLoginRedirect(query: unknown): string {
  const parsed = LoginQuerySchema.safeParse(query);
  return getSafeRedirect(
    parsed.success ? getFirstString(parsed.data.r) : undefined,
  );
}
