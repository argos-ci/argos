import type { Request } from "express";

import { createLoaders } from "./loaders.js";

export interface Context {
  auth: Request["auth"];
  loaders: ReturnType<typeof createLoaders>;
}

export const getContext = ({ req }: { req: Request }): Context => ({
  auth: req.auth,
  loaders: createLoaders(),
});
