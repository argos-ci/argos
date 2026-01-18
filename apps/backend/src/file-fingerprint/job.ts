import config from "@/config";
import { File } from "@/database/models";
import { createModelJob } from "@/job-core";
import { getS3Client } from "@/storage";

import { processFileFingerprint } from "./process";

export const fileFingerprintJob = createModelJob(
  "fileFingerprint",
  File,
  async (file) => {
    await processFileFingerprint(file, {
      s3: getS3Client(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { timeout: 30_000 },
);
