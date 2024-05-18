import { STATUS_CODES } from "node:http";
import type { RequestHandler } from "express";

import config from "@/config/index.js";

/**
 * Takes a route handling function and returns
 * a function that wraps it in a `try/catch`. Caught
 * exceptions are forwarded to the `next` handler.
 */
export const asyncHandler = (requestHandler: RequestHandler) => {
  const wrappedHandler: RequestHandler = async (req, res, next) => {
    try {
      await requestHandler(req, res, next);
    } catch (err: any) {
      // Handle all kinds of errors
      err.status = Number.isInteger(err.status)
        ? err.status
        : Number.isInteger(err.statusCode)
          ? err.statusCode
          : Number.isInteger(err.code)
            ? err.code
            : 500;
      next(err);
    }
  };
  return wrappedHandler;
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
      return requestHandler(...args);
    } else {
      return next();
    }
  };

/**
 * HTTPError is a subclass of Error that includes an HTTP status code.
 */
class HTTPError extends Error {
  public statusCode: number;
  constructor(statusCode: number, message?: string, options?: ErrorOptions) {
    super(message || STATUS_CODES[statusCode], options);
    this.statusCode = statusCode;
  }
}

export function boom(
  statusCode: number,
  message?: string,
  options?: ErrorOptions,
) {
  return new HTTPError(statusCode, message, options);
}
