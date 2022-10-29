import config from "@argos-ci/config";
import { ScreenshotDiff } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";
import { s3 } from "@argos-ci/storage";

import { computeScreenshotDiff } from "./computeScreenshotDiff";

export const job = createModelJob(
  "screenshotDiff",
  ScreenshotDiff,
  async (screenshotDiff) => {
    await computeScreenshotDiff(screenshotDiff, {
      s3: s3(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { prefetch: 2 }
);
