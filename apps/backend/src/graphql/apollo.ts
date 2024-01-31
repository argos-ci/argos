import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import * as Sentry from "@sentry/node";

import { getContext } from "./context.js";
import { schema } from "./schema.js";

const apolloSentryPlugin: ApolloServerPlugin = {
  requestDidStart: async () => {
    return {
      didEncounterErrors: async (ctx) => {
        for (const error of ctx.errors) {
          const code = error.extensions?.["code"];
          // Ignore some errors
          if (
            code === "FORBIDDEN" ||
            code === "NOT_FOUND" ||
            code === "BAD_USER_INPUT"
          ) {
            continue;
          }

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
        }
      },
    };
  },
};

export const apolloServer = new ApolloServer({
  schema,
  plugins: [apolloSentryPlugin],
});

export const createApolloMiddleware = () =>
  expressMiddleware(apolloServer, {
    context: async ({ req }) => getContext(req),
  });
