import { STATUS_CODES } from "node:http";
import type { ErrorCode } from "@argos/error-types";
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

type HttpErrorOptions = ErrorOptions & {
  details?: {
    message: string;
  }[];
  code?: ErrorCode;
};

/**
 * HTTPError is a subclass of Error that includes an HTTP status code.
 */
export class HTTPError extends Error {
  public statusCode: number;
  public code: ErrorCode | null;
  public details:
    | {
        message: string;
      }[]
    | undefined;

  constructor(
    statusCode: number,
    message?: string,
    options?: HttpErrorOptions,
  ) {
    super(message || STATUS_CODES[statusCode], options);
    this.statusCode = statusCode;
    this.details = options?.details;
    this.code = options?.code || null;
  }
}

export function boom(
  statusCode: number,
  message?: string,
  options?: HttpErrorOptions,
) {
  return new HTTPError(statusCode, message, options);
}
