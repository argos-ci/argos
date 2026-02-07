import config from "@/config";
import { ScreenshotDiff } from "@/database/models";
import { createModelJob } from "@/job-core";
import { getS3Client } from "@/storage";

import { computeScreenshotDiff } from "./computeScreenshotDiff";

export const job = createModelJob(
  "screenshotDiff",
  ScreenshotDiff,
  async (screenshotDiff) => {
    await computeScreenshotDiff(screenshotDiff, {
      s3: getS3Client(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { timeout: 60_000 },
);
