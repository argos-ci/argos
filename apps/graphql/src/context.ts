import type { Request } from "express";

import type { User } from "@argos-ci/database/models";

import { createLoaders } from "./loaders.js";

export interface Context {
  user: User | null;
  loaders: ReturnType<typeof createLoaders>;
}

export const getContext = ({ req }: { req: Request }): Context => ({
  user: req.user ?? null,
  loaders: createLoaders(),
});
