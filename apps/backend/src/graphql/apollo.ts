import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import * as Sentry from "@sentry/node";
import { RequestHandler } from "express";

import { HTTPError } from "@/util/error";

import { getContext, type Context } from "./context";
import { schema } from "./schema";

const apolloSentryPlugin: ApolloServerPlugin<Context> = {
  requestDidStart: async () => {
    return {
      didEncounterErrors: async (ctx) => {
        for (const error of ctx.errors) {
          if (
            error.originalError instanceof HTTPError &&
            error.originalError.code
          ) {
            error.extensions["argosErrorCode"] = error.originalError.code;

            // Ignore SAML SSO required errors
            if (error.originalError.code === "SAML_SSO_REQUIRED") {
              continue;
            }
          }

          const code = error.extensions?.["code"];

          // Ignore some errors
          if (
            code === "FORBIDDEN" ||
            code === "NOT_FOUND" ||
            code === "BAD_USER_INPUT"
          ) {
            continue;
          }

          Sentry.withScope((scope) => {
            if (ctx.contextValue.auth) {
              scope.setUser({
                id: ctx.contextValue.auth.account.id,
                username: ctx.contextValue.auth.account.slug,
                ...(ctx.contextValue.auth.user.email
                  ? { email: ctx.contextValue.auth.user.email }
                  : {}),
              });
            }
            // Annotate the scope with the query and variables
            scope.setExtras({
              operationName: ctx.operationName,
              variables: ctx.request.variables,
            });

            if (error.path && error.name === "GraphQLError") {
              Sentry.withScope((scope) => {
                scope.setTag("graphql", "exec_error");
                scope.setExtras({
                  source: error.source && error.source.body,
                  positions: error.positions,
                  path: error.path,
                });
                Sentry.captureException(error);
              });
            } else {
              Sentry.withScope((scope) => {
                scope.setTag("graphql", "wrong_query");
                scope.setExtras({
                  source: error.source && error.source.body,
                  positions: error.positions,
                });
                Sentry.captureMessage(`GraphQLWrongQuery: ${error.message}`);
              });
            }
          });
        }
      },
    };
  },
};

export const apolloServer = new ApolloServer<Context>({
  schema,
  plugins: [apolloSentryPlugin],
});

export const createApolloMiddleware = (): RequestHandler =>
  expressMiddleware(apolloServer, {
    context: async ({ req }) => getContext(req),
  });
