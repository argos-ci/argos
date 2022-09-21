import { File } from "@argos-ci/database/models";

export const getUnknownScreenshotKeys = async (keys) => {
  const existingFiles = await File.query().select("key").whereIn("key", keys);
  const existingKeys = existingFiles.map((file) => file.key);
  return Array.from(new Set(keys.filter((key) => !existingKeys.includes(key))));
};
