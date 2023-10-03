import type { BaseContext } from "@apollo/server";
import type { Request } from "express";

import { createLoaders } from "./loaders.js";

export type Context = BaseContext & {
  auth: Request["auth"];
  loaders: ReturnType<typeof createLoaders>;
};

export const getContext = ({ req }: { req: Request }): Context => ({
  auth: req.auth,
  loaders: createLoaders(),
});
