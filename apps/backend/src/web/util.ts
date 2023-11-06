import type { RequestHandler } from "express";

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
      // Handle objection errors
      const candidates = [err.status, err.statusCode, err.code, 500];
      err.status = candidates.find(Number.isInteger);
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
    if (req.subdomains[0] === subdomain) {
      return requestHandler(...args);
    } else {
      return next();
    }
  };
