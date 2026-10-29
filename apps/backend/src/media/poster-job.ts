import { MediaVersion } from "@/database/models";
import { createJob } from "@/job-core";

import { POSTER_PROBE_TIMEOUT_MS, refreshMediaPoster } from "./poster";

/**
 * Asks the CDN for a freshly uploaded video's poster frame, so the pull request
 * comment shows it seconds after the upload rather than at the next sweep.
 *
 * One try: a frame that is not ready yet is left to `sweepMediaPosters`, which
 * keeps asking without logging a failure for every minute the CDN takes.
 */
export const mediaPosterJob = createJob<string>(
  "mediaPoster",
  {
    perform: async (versionId) => {
      const version = await MediaVersion.query().findById(versionId);
      if (!version) {
        return;
      }
      await refreshMediaPoster(version);
    },
  },
  // Probes mostly wait on the CDN, so several can share a worker.
  { timeout: POSTER_PROBE_TIMEOUT_MS * 2, prefetch: 5 },
);
