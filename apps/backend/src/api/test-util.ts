import { Express, Router } from "express";

import { createTestApp } from "@/web/test-util.js";

import { CreateAPIHandler, registerHandler } from "./util";

/**
 * Create a test app with the given handler.
 */
export function createTestHandlerApp(create: CreateAPIHandler): Express {
  const router = Router();
  registerHandler(router, create);
  return createTestApp(router);
}
