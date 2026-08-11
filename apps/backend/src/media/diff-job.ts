import config from "@/config";
import { MediaDiff } from "@/database/models";
import { createModelJob } from "@/job-core";
import { getS3Client } from "@/storage";

import { computeMediaDiff } from "./diff";

/**
 * Computes the diff between the two halves of a before/after media pair.
 *
 * Off the request entirely: an upload answers with a share URL as soon as the
 * bytes land, and the mask shows up on the page a moment later. The same
 * 60 second budget a screenshot diff gets — it is the same engine on
 * comparable images.
 */
export const mediaDiffJob = createModelJob(
  "mediaDiff",
  MediaDiff,
  async (mediaDiff) => {
    await computeMediaDiff(mediaDiff, {
      s3: getS3Client(),
      bucket: config.get("s3.screenshotsBucket"),
    });
  },
  { timeout: 60_000 },
);
