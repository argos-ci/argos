import config from "@/config/index.js";
import { ScreenshotDiff } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";
import { s3 } from "@/storage/index.js";

import { computeScreenshotDiff } from "./computeScreenshotDiff.js";

export const job = createModelJob(
  "screenshotDiff",
  ScreenshotDiff,
  async (screenshotDiff) => {
    await computeScreenshotDiff(screenshotDiff, {
      s3: s3(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { prefetch: 2 },
);
