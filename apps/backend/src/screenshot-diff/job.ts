import config from "@/config/index.js";
import { ArtifactDiff } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";
import { getS3Client } from "@/storage/index.js";

import { computeScreenshotDiff } from "./computeScreenshotDiff.js";

export const job = createModelJob(
  "screenshotDiff",
  ArtifactDiff,
  async (screenshotDiff) => {
    await computeScreenshotDiff(screenshotDiff, {
      s3: getS3Client(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { timeout: 30_000 },
);
