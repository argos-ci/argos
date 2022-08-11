import { HttpError } from "express-err";
import { Screenshot } from "@argos-ci/database/models";

export const mustBeEnabledAuthRepo = async (req, _res, next) => {
  if (!req.authRepository.enabled) {
    throw new HttpError(
      403,
      `Repository not enabled (name: "${req.authRepository.name}")`
    );
  }

  next();
};

export const getUnknownScreenshotKeys = async (keys) => {
  const existingScreenshots = await Screenshot.query()
    .select("s3Id")
    .whereIn("s3Id", keys);
  const existingKeys = existingScreenshots.map((screenshot) => screenshot.s3Id);
  return keys.filter((key) => !existingKeys.includes(key));
};
