import type { ErrorRequestHandler } from "express";

/**
 * A middleware that sends JSON responses for errors if request accepts JSON.
 */
export function jsonErrorHandler(): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (error instanceof Error && process.env["NODE_ENV"] !== "test") {
      console.log(error, error.stack);
    }

    if (req.accepts("json") === "json") {
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

      res.send({
        error: {
          message,
          code,
        },
      });
    } else {
      next(error);
    }
  };
}
