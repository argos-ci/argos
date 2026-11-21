import { Express, Router } from "express";

import { createTestApp } from "@/web/test-util";

import { CreateAPIHandler, errorHandler, registerHandler } from "./util";

/**
 * Create a test app with the given handler(s).
 */
export function createTestHandlerApp(...creates: CreateAPIHandler[]): Express {
  const router = Router();
  for (const create of creates) {
    registerHandler(router, create);
  }
  // Like the API router: an error reaching past a route is answered once.
  router.use(errorHandler);
  return createTestApp(router);
}
