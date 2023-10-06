import type { ApolloServer } from "@apollo/server";
import express, { RequestHandler } from "express";

import type { Account, User } from "@/database/models/index.js";

let started = false;

export const createApolloServerApp = async (
  apolloServer: ApolloServer,
  getMiddleware: () => RequestHandler,
  auth: { user: User; account: Account } | null,
) => {
  const app = express();
  app.use(((req, _res, next) => {
    (req as any).__MOCKED_AUTH__ = auth;
    next();
  }) as express.RequestHandler);

  if (!started) {
    await apolloServer.start();
  }
  started = true;
  app.use("/graphql", express.json(), getMiddleware());

  return app;
};
