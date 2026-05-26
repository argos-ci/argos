import * as Sentry from "@sentry/node";
import type { RequestHandler } from "express";

const HEADER_TAGS = [
  ["x-argos-release-version", "clientReleaseVersion"],
  ["x-argos-cli-version", "clientCliVersion"],
  ["x-argos-retry-attempt", "clientRetryAttempt"],
  ["x-argos-request-id", "clientRequestId"],
] as const;

/**
 * Capture Argos client headers into Sentry and the request logger so they
 * appear on both error reports and structured HTTP logs.
 */
export const argosHeadersMiddleware: RequestHandler = (req, _res, next) => {
  const scope = Sentry.getCurrentScope();
  const bindings: Record<string, string> = {};
  for (const [header, tag] of HEADER_TAGS) {
    const value = req.headers[header];
    if (typeof value === "string") {
      scope.setTag(tag, value);
      bindings[tag] = value;
    }
  }
  if (req.log && Object.keys(bindings).length > 0) {
    req.log.setBindings(bindings);
  }
  next();
};
