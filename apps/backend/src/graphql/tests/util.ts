import type { ApolloServer, BaseContext } from "@apollo/server";
import express, { RequestHandler } from "express";

import type { AuthMethod } from "@/auth/auth-method";
import type { AuthSessionPayload } from "@/auth/payload";
import type { Account, User } from "@/database/models";

let startPromise: Promise<void> | null = null;

/** Who a mocked request comes from, on a session opened by an email login unless set. */
export type MockedViewer = {
  user: User;
  account: Account;
  authMethod?: AuthMethod;
  /** Set for a session opened by a SAML login to this team. */
  samlTeamId?: string;
};

export async function createApolloServerApp<Context extends BaseContext>(
  apolloServer: ApolloServer<Context>,
  getMiddleware: () => RequestHandler,
  auth: MockedViewer | null,
): Promise<express.Express> {
  const app = express();
  const mockedAuth: AuthSessionPayload | null = auth
    ? {
        type: "session",
        sessionId: "mocked",
        authMethod: auth.samlTeamId ? "saml" : "email",
        samlTeamId: null,
        ...auth,
      }
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
