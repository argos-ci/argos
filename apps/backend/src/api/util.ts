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

import logger from "@/logger";
import { getProtectedResourceMetadataUrl } from "@/oauth/metadata";
import { boom, HTTPError } from "@/util/error";
import { asyncHandler } from "@/web/util";

import {
  gateResponseOnRequestScope,
  runInRequestScope,
} from "./request-context";
import { zodSchema } from "./schema";
import { authenticateRequest, type AuthFromSecurity } from "./security";

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
  body: TOperation["requestBody"] extends { content: any }
    ? z.output<
        TOperation["requestBody"]["content"]["application/json"]["schema"]
      >
    : null;
  /**
   * Resolve the authenticated payload for this request, memoized. Exposed as a
   * function (rather than an eagerly-resolved value) so handlers can start
   * authentication in parallel with their own queries — e.g.
   * `Promise.all([req.ctx.auth(), Build.query()...])`. The global handler also
   * kicks it off eagerly so authentication always runs and is enforced even
   * when a handler doesn't consume the result.
   */
  auth: () => Promise<AuthFromSecurity<TOperation["security"]>>;
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

type PatchOperationHandler<TPath extends Path> = OperationRequestHandler<
  paths[TPath] extends { patch: ZodOpenApiOperationObject }
    ? paths[TPath]["patch"]
    : never
>;

type DeleteOperationHandler<TPath extends Path> = OperationRequestHandler<
  paths[TPath] extends { delete: ZodOpenApiOperationObject }
    ? paths[TPath]["delete"]
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
  _next,
) => {
  // The same error can reach here twice (e.g. eager auth enforcement and a
  // handler that also awaited `req.ctx.auth()`); once the response is committed
  // there is nothing left to do.
  if (res.headersSent) {
    return;
  }

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

  if (statusCode >= 500) {
    logger.error({
      error,
      reportToSentry: false, // There is already a middleware handling this
    });
  }

  if (statusCode === 401) {
    // MCP/OAuth handshake: tell clients where to find the Protected Resource
    // Metadata so they can discover the authorization server (RFC 9728).
    res.set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${getProtectedResourceMetadataUrl()}"`,
    );
  }

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
  patch<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<PatchOperationHandler<TPath>>
  ): void;
  delete<TPath extends Path>(
    path: TPath,
    ...handlers: HandlerParams<DeleteOperationHandler<TPath>>
  ): void;
};

/**
 * Register a handler for the given HTTP method.
 */
function handler<TMethod extends "get" | "post" | "put" | "patch" | "delete">(
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
      asyncHandler((req, res, next) => {
        runInRequestScope(() => {
          // Memoized, lazily-resolved auth. Handlers call `req.ctx.auth()`,
          // often in parallel with their own queries.
          let authPromise: ReturnType<typeof authenticateRequest> | null = null;
          const auth = () => {
            authPromise ??= authenticateRequest(req, operation.security);
            return authPromise;
          };

          const ctx: RequestCtx<ZodOpenApiOperationObject> = {
            params: null,
            query: null,
            body: null,
            auth: auth as RequestCtx<ZodOpenApiOperationObject>["auth"],
          };
          (
            req as Request & { ctx: RequestCtx<ZodOpenApiOperationObject> }
          ).ctx = ctx;

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
              operation.requestBody.content["application/json"]
                .schema instanceof ZodType
            ) {
              ctx.body = operation.requestBody.content[
                "application/json"
              ].schema.parse(
                req.body,
              ) as RequestCtx<ZodOpenApiOperationObject>["body"];
            }
          } catch (error) {
            if (error instanceof ZodError) {
              const errorMessages = error.issues.map((issue) => ({
                message: `${issue.path.join(".")} is ${issue.message}`,
              }));
              next(
                boom(400, "Invalid request", {
                  cause: error,
                  details: errorMessages,
                }),
              );
              return;
            }
            next(error);
            return;
          }

          // Hold the response until background `waitUntil` work (e.g. the token
          // `lastUsedAt` refresh) has settled.
          gateResponseOnRequestScope(res);

          // Kick authentication off eagerly so it runs in parallel and is
          // enforced even if the handler never consumes it: a rejection is
          // forwarded to the error handler when nothing else has responded yet.
          if (operation.security && operation.security.length > 0) {
            auth().catch((error: unknown) => {
              if (!res.headersSent) {
                next(error);
              }
            });
          }

          next();
        });
      }),
      ...wrappedHandlers,
      // @ts-expect-error wrong type from Sentry
      Sentry.expressErrorHandler({
        shouldHandleError: (error) => {
          // Capture 400 (to see validation errors) and 500+ errors
          if (error instanceof HTTPError) {
            return error.statusCode === 400 || error.statusCode >= 500;
          }
          // Capture all other errors
          return true;
        },
      }),
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
    patch: handler(router, "patch"),
    delete: handler(router, "delete"),
  };
  return create(context);
}
