import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { z, ZodError, ZodType } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { asyncHandler } from "@/web/util.js";

import { zodSchema } from "./schema.js";

type paths = typeof zodSchema.paths;

type Path = keyof paths;

type ExtractResponseType<TResponses, TDefault = Record<string, never>> =
  TResponses extends Record<string, infer R>
    ? R extends { content: { "application/json": { schema: ZodType } } }
      ? z.infer<R["content"]["application/json"]["schema"]>
      : TDefault
    : TDefault;

type RequestCtx<TOperation extends ZodOpenApiOperationObject> = {
  params: TOperation["requestParams"] extends { path: any }
    ? z.output<TOperation["requestParams"]["path"]>
    : null;
  query: TOperation["requestParams"] extends { query: any }
    ? z.output<TOperation["requestParams"]["query"]>
    : null;
};

type OperationRequestHandler<TOperation extends ZodOpenApiOperationObject> = (
  req: Request<
    TOperation["requestParams"] extends { path: any }
      ? z.input<TOperation["requestParams"]["path"]>
      : Record<string, never>,
    ExtractResponseType<TOperation["responses"]>,
    never,
    TOperation["requestParams"] extends { query: any }
      ? z.input<TOperation["requestParams"]["query"]>
      : Record<string, never>,
    Record<string, any>
  > & {
    ctx: RequestCtx<TOperation>;
  },
  res: Response<
    ExtractResponseType<TOperation["responses"]>,
    Record<string, any>
  >,
  next: NextFunction,
) => void;

type GetOperationHandler<TPath extends Path> = OperationRequestHandler<
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
  console.log(error);
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

type HandlerParams<T> = (T | T[])[];

type Context = {
  get<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<GetOperationHandler<TPath>>
  ): void;
};

/**
 * Register a GET handler.
 */
function get(router: Router) {
  const apiHandler: Context["get"] = (path, ...handlers) => {
    const operation: ZodOpenApiOperationObject = zodSchema.paths[path].get;
    const wrappedHandlers = handlers.map((handler) =>
      typeof handler === "function"
        ? asyncHandler(handler as RequestHandler)
        : (handler as RequestHandler[]),
    );
    router.get(
      convertPath(path),
      asyncHandler((req, res, next) => {
        const ctx: RequestCtx<ZodOpenApiOperationObject> = {
          params: null,
          query: null,
        };
        (req as Request & { ctx: RequestCtx<ZodOpenApiOperationObject> }).ctx =
          ctx;
        try {
          if (operation.requestParams?.path) {
            ctx.params = operation.requestParams.path.parse(
              req.params,
            ) as RequestCtx<ZodOpenApiOperationObject>["params"];
          }
          if (operation.requestParams?.query) {
            ctx.query = operation.requestParams.query.parse(
              req.query,
            ) as RequestCtx<ZodOpenApiOperationObject>["query"];
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
  };
  return apiHandler;
}

export type CreateAPIHandler = (context: Context) => void;

/**
 * Register an API handler.
 */
export function registerHandler(router: Router, create: CreateAPIHandler) {
  const context: Context = { get: get(router) };
  return create(context);
}
