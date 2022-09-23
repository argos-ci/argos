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

    if (repository.private) {
      const account = await repository.getAccount();
      const currentConsumption =
        await account.getScreenshotsCurrentConsumption();
      const maxConsumption = await account.screenshotsMonthlyLimit();

      if (currentConsumption / maxConsumption >= 1.1) {
        throw new HttpError(
          402,
          `Build refused for insufficient credit. Thank to upgrade Argos plan`
        );
      }
    }

    req.authRepository = repository;
    next();
  }),
];
