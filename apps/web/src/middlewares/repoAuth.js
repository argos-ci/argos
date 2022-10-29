import { HttpError } from "express-err";

import { Repository } from "@argos-ci/database/models";

import { asyncHandler } from "../util";
import { bearerAuth } from "./bearerAuth";
import githubActions from "./tokenless-strategies/github-actions";

const tokenlessStrategies = [githubActions];

export const repoAuth = [
  bearerAuth,
  asyncHandler(async (req, _res, next) => {
    const strategy = tokenlessStrategies.find((strategy) =>
      strategy.detect(req.bearerToken)
    );

    const repository = strategy
      ? await strategy.getRepository(req.bearerToken)
      : await Repository.query().findOne({ token: req.bearerToken });

    if (!repository) {
      throw new HttpError(
        401,
        `Repository not found (token: "${req.bearerToken}")`
      );
    }

    req.authRepository = repository;
    next();
  }),
];
