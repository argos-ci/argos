import * as Sentry from "@sentry/node";
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";

import { schema } from "./schema.js";

export const apolloServer = new ApolloServer({
  plugins: [
    process.env["NODE_ENV"] === "production"
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageGraphQLPlayground(),
  ],
  schema,
  context: ({ req }) => ({ user: req.user || null }),
  formatError: (error) => {
    // We do want to report errors that are intentionally inside the resolvers.
    if (!error.originalError || error.originalError.name !== "APIError") {
      if (error.path || error.name !== "GraphQLError") {
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

    return { message: error.message };
  },
});
