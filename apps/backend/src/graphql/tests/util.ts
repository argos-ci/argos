import express from "express";

import type { Account, User } from "@/database/models";

import { graphqlMiddleware } from "../yoga";

/**
 * Build a minimal Express app serving `/graphql`, with the given account
 * authenticated. Mirrors the production wiring in `web/app-router.ts` — the
 * body is parsed by Express and reused by Yoga — minus the CSRF and security
 * middlewares, which have their own tests.
 */
export function createGraphQLApp(
  auth: { user: User; account: Account } | null,
): express.Express {
  const app = express();
  app.use(((req, _res, next) => {
    (req as any).__MOCKED_AUTH__ = auth;
    next();
  }) as express.RequestHandler);

  app.use("/graphql", express.json(), graphqlMiddleware);

  return app;
}
