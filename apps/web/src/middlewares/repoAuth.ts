// @ts-ignore
import { HttpError } from "express-err";

import { Repository } from "@argos-ci/database/models";

import { asyncHandler } from "../util.js";
import { bearerAuth } from "./bearerAuth.js";
import githubActions from "./tokenless-strategies/github-actions.js";

declare global {
  namespace Express {
    interface Request {
      authRepository?: Repository;
    }
  }
}

const tokenlessStrategies = [githubActions];

export const repoAuth = [
  bearerAuth,
  asyncHandler(async (req, _res, next) => {
    const { bearerToken } = req;

    if (!bearerToken) {
      throw new HttpError(
        401,
        `Missing bearer token. Please provide a token in the Authorization header.`
      );
    }

    const strategy =
      tokenlessStrategies.find((strategy) => strategy.detect(bearerToken)) ??
      null;

    const repository = strategy
      ? await strategy.getRepository(bearerToken)
      : await Repository.query().findOne({ token: bearerToken });

    if (!repository) {
      throw new HttpError(
        401,
        `Repository not found (token: "${bearerToken}")`
      );
    }

    req.authRepository = repository;
    next();
  }),
];
