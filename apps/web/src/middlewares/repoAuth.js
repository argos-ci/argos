import { HttpError } from "express-err";
import { Repository } from "@argos-ci/database/models";
import { bearerAuth } from "./bearerAuth";
import { asyncHandler } from "../util";

export const repoAuth = [
  bearerAuth,
  asyncHandler(async (req, _res, next) => {
    const repository = await Repository.query().findOne({
      token: req.bearerToken,
    });

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
