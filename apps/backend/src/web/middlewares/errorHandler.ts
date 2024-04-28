import * as Sentry from "@sentry/node";
import type { ErrorRequestHandler } from "express";

export function errorHandler() {
  const handlers: ErrorRequestHandler[] = [
    Sentry.Handlers.errorHandler(),
    (error, _req, _res, next) => {
      if (process.env["NODE_ENV"] !== "test") {
        console.log(error, error.stack);
      }
      next(error);
    },
    (error: unknown, _req, res) => {
      const statusCode =
        error instanceof Error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const code =
        error instanceof Error && "code" in error ? error.code : undefined;
      res.status(statusCode);
      return res.send({
        error: {
          message,
          code,
        },
      });
    },
  ];
  return handlers;
}
