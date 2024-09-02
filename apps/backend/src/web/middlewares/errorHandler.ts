import type { ErrorRequestHandler } from "express";

export function errorHandler() {
  const handlers: ErrorRequestHandler[] = [
    (error, _req, _res, next) => {
      if (process.env["NODE_ENV"] !== "test") {
        console.log(error, error.stack);
      }
      next(error);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (error: unknown, _req, res, _next) => {
      const statusCode =
        error instanceof Error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : error instanceof Error &&
              "status" in error &&
              typeof error.status === "number"
            ? error.status
            : error instanceof Error &&
                "code" in error &&
                typeof error.code === "number"
              ? error.code
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
