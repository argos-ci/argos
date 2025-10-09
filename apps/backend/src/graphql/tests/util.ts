import type { ApolloServer, BaseContext } from "@apollo/server";
import express, { RequestHandler } from "express";

import type { Account, User } from "@/database/models/index.js";

let started = false;

export async function createApolloServerApp<Context extends BaseContext>(
  apolloServer: ApolloServer<Context>,
  getMiddleware: () => RequestHandler,
  auth: { user: User; account: Account } | null,
): Promise<express.Express> {
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
}
