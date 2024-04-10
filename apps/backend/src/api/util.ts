import type { ErrorRequestHandler, RequestHandler, Router } from "express";
import { z, ZodError, ZodType } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { asyncHandler } from "@/web/util.js";

import { zodSchema } from "./schema.js";

type paths = typeof zodSchema.paths;

type ExtractResponseType<TResponses, TDefault = Record<string, never>> =
  TResponses extends Record<string, infer R>
    ? R extends { content: { "application/json": { schema: ZodType } } }
      ? z.infer<R["content"]["application/json"]["schema"]>
      : TDefault
    : TDefault;

type OperationRequestHandler<TOperation extends ZodOpenApiOperationObject> =
  RequestHandler<
    TOperation["requestParams"] extends { path: any }
      ? z.infer<TOperation["requestParams"]["path"]>
      : Record<string, never>,
    ExtractResponseType<TOperation["responses"]>,
    never,
    TOperation["requestParams"] extends { query: any }
      ? z.infer<TOperation["requestParams"]["query"]>
      : Record<string, never>,
    Record<string, any>
  >;

type GetOperationHandler<TPath extends keyof paths> = OperationRequestHandler<
  paths[TPath]["get"]
>;

/**
 * Convert OpenAPI path to Express path
 */
function convertPath(path: string) {
  return path.replace(/{([^}]+)}/g, ":$1");
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
) => {
  if (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

/**
 * Register a GET route.
 */
export function get<TPath extends keyof paths>(
  router: Router,
  path: TPath,
  ...handlers: (GetOperationHandler<TPath> | GetOperationHandler<TPath>[])[]
) {
  const operation: ZodOpenApiOperationObject = zodSchema.paths[path].get;
  const wrappedHandlers = handlers.map((handler) =>
    typeof handler === "function"
      ? asyncHandler(handler as RequestHandler)
      : (handler as RequestHandler[]),
  );
  router.get(
    convertPath(path),
    asyncHandler((req, res, next) => {
      try {
        if (operation.requestParams?.path) {
          operation.requestParams.path.parse(req.params);
        }
        if (operation.requestParams?.query) {
          operation.requestParams.query.parse(req.query);
        }
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessages = error.errors.map((issue: any) => ({
            message: `${issue.path.join(".")} is ${issue.message}`,
          }));
          res
            .status(400)
            .json({ error: "Invalid request", details: errorMessages });
          return;
        }
        throw error;
      }

      next();
    }),
    ...wrappedHandlers,
  );
}
