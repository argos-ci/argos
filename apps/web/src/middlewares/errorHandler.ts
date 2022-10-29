import * as Sentry from "@sentry/node";
import type { ErrorRequestHandler } from "express";
// @ts-ignore
import expressErr from "express-err";

export function errorHandler({ formatters }: any) {
  const handlers: ErrorRequestHandler[] = [
    Sentry.Handlers.errorHandler(),
    (error, _req, _res, next) => {
      if (process.env["NODE_ENV"] !== "test") {
        console.log(error, error.stack);
      }
      next(error);
    },
    expressErr.default({
      exitOnUncaughtException: false,
      formatters,
    }),
  ];
  return handlers;
}
