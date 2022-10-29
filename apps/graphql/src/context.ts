import type { Request } from "express";

import type { User } from "@argos-ci/database/models";

export interface Context {
  user: User | null;
}

export const getContext = ({ req }: { req: Request }): Context => ({
  user: req.user ?? null,
});
