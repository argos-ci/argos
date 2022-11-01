import type { ApolloServer } from "apollo-server-express";
import express from "express";

import type { User } from "@argos-ci/database/models";

let started = false;

export const createApolloServerApp = async (
  apolloServer: ApolloServer,
  { user }: { user?: User | null } = {}
) => {
  const app = express();
  app.use(((req, _res, next) => {
    // @ts-ignore
    req.user = user;
    next();
  }) as express.RequestHandler);

  if (!started) {
    await apolloServer.start();
  }
  started = true;
  apolloServer.applyMiddleware({ app });

  return app;
};
