import * as Sentry from "@sentry/node";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { json } from "express";
import { z, ZodError, ZodType } from "zod";
import {
  ZodOpenApiOperationObject,
  ZodOpenApiPathItemObject,
} from "zod-openapi";

import { asyncHandler, boom } from "@/web/util.js";

import { zodSchema } from "./schema.js";

type paths = typeof zodSchema.paths;

type Path = keyof paths;

type ExtractRequestType<TRequestBody, TDefault = never> = TRequestBody extends {
  content: { "application/json": { schema: ZodType } };
}
  ? z.infer<TRequestBody["content"]["application/json"]["schema"]>
  : TDefault;

type ExtractResponseType<TResponses, TDefault = never> =
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
    ExtractResponseType<TOperation["responses"], never>,
    ExtractRequestType<TOperation["requestBody"], never>,
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
  paths[TPath] extends { get: ZodOpenApiOperationObject }
    ? paths[TPath]["get"]
    : never
>;

type PostOperationHandler<TPath extends Path> = OperationRequestHandler<
  paths[TPath] extends { post: ZodOpenApiOperationObject }
    ? paths[TPath]["post"]
    : never
>;

type PutOperationHandler<TPath extends Path> = OperationRequestHandler<
  paths[TPath] extends { put: ZodOpenApiOperationObject }
    ? paths[TPath]["put"]
    : never
>;

/**
 * Convert OpenAPI path to Express path
 */
function convertPath(path: string) {
  return path.replace(/{([^}]+)}/g, ":$1");
}

const DetailsSchema = z.array(z.object({ message: z.string() }));

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
) => {
  const details =
    error instanceof Error && "details" in error
      ? DetailsSchema.safeParse(error.details).data
      : undefined;

  const statusCode =
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;

  const message =
    error instanceof Error ? error.message : "Internal server error";

  res.status(statusCode).json({ error: message, details });
};

type HandlerParams<T> = (T | T[])[];

type Context = {
  get<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<GetOperationHandler<TPath>>
  ): void;
  post<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<PostOperationHandler<TPath>>
  ): void;
  put<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<PutOperationHandler<TPath>>
  ): void;
};

/**
 * Register a GET handler.
 */
function handler<TMethod extends "get" | "post" | "put">(
  router: Router,
  method: TMethod,
) {
  const apiHandler = (path: Path, ...handlers: RequestHandler[]) => {
    const pathItem: ZodOpenApiPathItemObject = zodSchema.paths[path];
    const operation = pathItem[method];
    if (!operation) {
      throw new Error(`Method ${method} not allowed for path ${path}`);
    }
    const wrappedHandlers = handlers.map((handler) =>
      typeof handler === "function"
        ? asyncHandler(handler as RequestHandler)
        : (handler as RequestHandler[]),
    );
    router[method](
      convertPath(path),
      // Temporary increase the limit
      // we should find a way to split the upload in several requests
      json({ limit: "3mb" }),
      asyncHandler((req, _res, next) => {
        const ctx: RequestCtx<ZodOpenApiOperationObject> = {
          params: null,
          query: null,
        };
        (req as Request & { ctx: RequestCtx<ZodOpenApiOperationObject> }).ctx =
          ctx;
        try {
          if (
            operation.requestParams?.path &&
            operation.requestParams.path instanceof ZodType
          ) {
            ctx.params = operation.requestParams.path.parse(
              req.params,
            ) as RequestCtx<ZodOpenApiOperationObject>["params"];
          }
          if (
            operation.requestParams?.query &&
            operation.requestParams?.query instanceof ZodType
          ) {
            ctx.query = operation.requestParams.query.parse(
              req.query,
            ) as RequestCtx<ZodOpenApiOperationObject>["query"];
          }
          if (
            operation.requestBody?.content?.["application/json"]?.schema &&
            operation.requestBody.content["application/json"].schema instanceof
              ZodType
          ) {
            operation.requestBody.content["application/json"].schema.parse(
              req.body,
            );
          }
        } catch (error) {
          if (error instanceof ZodError) {
            const errorMessages = error.issues.map((issue) => ({
              message: `${issue.path.join(".")} is ${issue.message}`,
            }));
            throw boom(400, "Invalid request", {
              cause: error,
              details: errorMessages,
            });
          }
          throw error;
        }

        next();
      }),
      ...wrappedHandlers,
      Sentry.expressErrorHandler(),
      errorHandler,
    );
  };
  return apiHandler;
}

export type CreateAPIHandler = (context: Context) => void;

/**
 * Register an API handler.
 */
export function registerHandler(router: Router, create: CreateAPIHandler) {
  const context: Context = {
    get: handler(router, "get"),
    post: handler(router, "post"),
    put: handler(router, "put"),
  };
  return create(context);
}
