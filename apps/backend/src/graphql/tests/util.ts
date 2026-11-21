import type { ApolloServer, BaseContext } from "@apollo/server";
import express, { RequestHandler } from "express";

import type { AuthSessionPayload } from "@/auth/payload";
import type { Account, User } from "@/database/models";

let startPromise: Promise<void> | null = null;

export async function createApolloServerApp<Context extends BaseContext>(
  apolloServer: ApolloServer<Context>,
  getMiddleware: () => RequestHandler,
  auth: {
    user: User;
    account: Account;
    /** Set for a session opened by a SAML login to this team. */
    samlTeamId?: string;
  } | null,
): Promise<express.Express> {
  const app = express();
  // Like an email or OAuth login unless the caller sets `samlTeamId`.
  const mockedAuth: AuthSessionPayload | null = auth
    ? { type: "session", sessionId: "mocked", samlTeamId: null, ...auth }
    : null;
  app.use(((req, _res, next) => {
    (req as any).__MOCKED_AUTH__ = mockedAuth;
    next();
  }) as express.RequestHandler);

  startPromise ??= apolloServer.start();
  await startPromise;

  app.use("/graphql", express.json(), getMiddleware());

  return app;
}
