import * as Sentry from "@sentry/node";
import type { Request, RequestHandler, Response } from "express";
import type { ExecutionArgs } from "graphql";
import { GraphQLError } from "graphql";
import {
  createYoga,
  maskError as defaultMaskError,
  useErrorHandler,
  type Plugin,
} from "graphql-yoga";

import { HTTPError } from "@/util/error";

import { getContext, type Context } from "./context";
import { schema } from "./schema";
import { toGraphQLError } from "./util";

/**
 * The Express request/response pair Yoga forwards to the context factory. Yoga
 * is mounted as Express middleware, so both are always present on the HTTP
 * transport — unlike the WebSocket transport, which builds its context in
 * `ws.ts`.
 */
type ServerContext = { req: Request; res: Response };

/**
 * Error codes describing a client mistake rather than a server fault: they get
 * an accurate message and are never reported to Sentry.
 */
const CLIENT_ERROR_CODES = new Set([
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_USER_INPUT",
  "UNAUTHENTICATED",
]);

/**
 * Unwrap the `HTTPError` a shared service threw, if this GraphQL error is
 * merely graphql-js wrapping one. Resolvers are expected to convert those
 * themselves with `toGraphQLError`; this catches the ones that don't.
 */
function getOriginalHTTPError(error: unknown): HTTPError | null {
  if (
    error instanceof GraphQLError &&
    error.originalError instanceof HTTPError
  ) {
    return error.originalError;
  }
  return null;
}

/**
 * Turn an error into the one sent to the client.
 *
 * Yoga masks anything that is not a deliberately thrown `GraphQLError`, which
 * would otherwise swallow the `argosErrorCode` extension the frontend reads to
 * drive the SAML SSO redirect and form field errors. So client errors
 * (4xx `HTTPError`) are translated the same way `toGraphQLError` does in a
 * resolver, keeping the location metadata graphql-js attached, and everything
 * else — including 5xx — falls through to Yoga's masking.
 */
function maskError(error: unknown, message: string, isDev?: boolean): Error {
  const httpError = getOriginalHTTPError(error);

  if (httpError) {
    const translated = toGraphQLError(httpError);
    // `toGraphQLError` returns the error untouched when it is a 5xx, which is a
    // genuine server fault and must stay masked.
    if (translated instanceof GraphQLError) {
      // Rewrite the wrapper in place rather than rebuilding it, so the nodes,
      // source, positions and path graphql-js attached survive untouched. The
      // `originalError` it still holds is never serialized into the response.
      const wrapper = error as GraphQLError;
      wrapper.message = translated.message;
      Object.assign(wrapper.extensions, translated.extensions);
      return wrapper;
    }
  }

  return defaultMaskError(error, message, isDev);
}

/**
 * Read the auth, operation name and variables to annotate a Sentry report with.
 * `useErrorHandler` hands over the `ExecutionArgs` for errors raised while
 * executing an operation, and the bare context for the phases running before
 * that (parsing, validation, context building), where no operation is resolved.
 */
function getErrorScope(context: Readonly<Record<string, any>>): {
  auth: Context["auth"] | undefined;
  operationName: string | undefined;
  variables: unknown;
} {
  if ("contextValue" in context) {
    const args = context as ExecutionArgs;
    return {
      auth: (args.contextValue as Context | undefined)?.auth,
      operationName: args.operationName ?? undefined,
      variables: args.variableValues,
    };
  }
  return {
    auth: (context as Partial<Context>).auth,
    operationName: undefined,
    variables: undefined,
  };
}

/**
 * Report GraphQL errors to Sentry, skipping the ones that describe a client
 * mistake. Registered as a user-land plugin, so it runs before Yoga masks
 * errors and still sees the original cause.
 */
function useSentryReporting(): Plugin<Context> {
  return useErrorHandler(({ errors, context }) => {
    const scopeData = getErrorScope(context);

    for (const error of errors) {
      if (!(error instanceof GraphQLError)) {
        continue;
      }

      // Enforced SAML SSO is a routine redirect the frontend handles on its
      // own, never a fault worth paging for.
      const httpError = getOriginalHTTPError(error);
      if (httpError?.code === "SAML_SSO_REQUIRED") {
        continue;
      }

      if (CLIENT_ERROR_CODES.has(String(error.extensions?.["code"]))) {
        continue;
      }

      Sentry.withScope((scope) => {
        if (scopeData.auth) {
          scope.setUser({
            id: scopeData.auth.account.id,
            username: scopeData.auth.account.slug,
            ...(scopeData.auth.user.email
              ? { email: scopeData.auth.user.email }
              : {}),
          });
        }
        // Annotate the scope with the query and variables
        scope.setExtras({
          operationName: scopeData.operationName,
          variables: scopeData.variables,
        });

        if (error.path && error.name === "GraphQLError") {
          scope.setTag("graphql", "exec_error");
          scope.setExtras({
            source: error.source && error.source.body,
            positions: error.positions,
            path: error.path,
          });
          Sentry.captureException(error);
        } else {
          scope.setTag("graphql", "wrong_query");
          scope.setExtras({
            source: error.source && error.source.body,
            positions: error.positions,
          });
          Sentry.captureMessage(`GraphQLWrongQuery: ${error.message}`);
        }
      });
    }
  });
}

/**
 * Strip the "Did you mean …?" hints graphql-js appends to validation errors:
 * they disclose type and field names to a client that guessed wrong, which
 * leaks the schema one typo at a time.
 */
function useHideSchemaSuggestions(): Plugin {
  return {
    onValidate() {
      return ({ result }) => {
        for (const error of result) {
          if (error instanceof GraphQLError) {
            error.message = error.message.replace(/ ?Did you mean(.+?)\?$/, "");
          }
        }
      };
    },
  };
}

const yoga = createYoga<ServerContext, Context>({
  schema,
  graphqlEndpoint: "/graphql",
  // The app authenticates with a same-origin session cookie and a CSRF header,
  // so no cross-origin request is ever legitimate. Yoga would otherwise reflect
  // the request origin back in `Access-Control-Allow-Origin`.
  cors: false,
  // File uploads are served by the REST API, so the GraphQL multipart request
  // parser is dead weight and extra attack surface.
  multipart: false,
  // Neither could load anyway — `requireCsrf` rejects a cookie-authenticated
  // navigation with no CSRF header, and the CSP on this route forbids the inline
  // scripts GraphiQL needs — so serving them would only widen the surface.
  graphiql: false,
  landingPage: false,
  maskedErrors: { maskError },
  plugins: [useSentryReporting(), useHideSchemaSuggestions()],
  context: ({ req, res }) => getContext(req, res),
});

/**
 * Serve GraphQL as Express middleware.
 *
 * Mounting the Yoga instance itself — `app.use(yoga.graphqlEndpoint, yoga)`, as
 * the docs suggest — would hand Express's `next` to the variadic parameter Yoga
 * merges into the server context, so the two signatures do not line up. Calling
 * it with just the request and response keeps the context exactly `ServerContext`.
 *
 * Yoga reads the route off `req.originalUrl`, so it still matches `/graphql`
 * even though Express strips the mount path from `req.url`.
 */
export const graphqlMiddleware: RequestHandler = (req, res) => {
  void yoga.handle(req, res);
};
