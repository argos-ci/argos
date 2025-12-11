import type { RequestHandler } from "express";

import config from "@/config/index.js";

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
      // Allow localhost for testing
      (config.get("env") === "test" && req.hostname === "localhost")
    ) {
      requestHandler(...args);
      return;
    }

    next();
  };
