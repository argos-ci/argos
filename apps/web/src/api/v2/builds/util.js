import { HttpError } from "express-err";
import { File } from "@argos-ci/database/models";
import { asyncHandler } from "../../../util";

export const mustBeEnabledAuthRepo = asyncHandler((req, _res, next) => {
  if (!req.authRepository.enabled) {
    throw new HttpError(
      403,
      `Repository not enabled (name: "${req.authRepository.name}")`
    );
  }

  next();
});

export const getUnknownScreenshotKeys = async (keys) => {
  const existingFiles = await File.query().select("key").whereIn("key", keys);
  const existingKeys = existingFiles.map((file) => file.key);
  return Array.from(new Set(keys.filter((key) => !existingKeys.includes(key))));
};
