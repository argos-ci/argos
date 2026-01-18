import config from "@/config";
import { File } from "@/database/models";
import { createJob } from "@/job-core";
import { getS3Client } from "@/storage";

import { processFileFingerprint } from "./process";

export const fileFingerprintJob = createJob(
  "fileFingerprint",
  {
    perform: async (fileId) => {
      const file = await File.query().findById(fileId).throwIfNotFound();
      await processFileFingerprint(file, {
        s3: getS3Client(),
        bucket: config.get("s3.screenshotsBucket"),
      });
    },
  },
  { timeout: 30_000 },
);
