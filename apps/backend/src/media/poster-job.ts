import { MediaVersion } from "@/database/models";
import { createJob } from "@/job-core";

import { probeMediaPoster } from "./poster";

/**
 * How long the upload's probe waits on the CDN. Longer than a request can
 * afford: ImageKit holds a request for a frame it is still extracting for about
 * 15 seconds, and a frame that arrives inside that window is ready before
 * anyone has looked at the pull request.
 */
const UPLOAD_PROBE_TIMEOUT_MS = 30_000;

/**
 * Asks the CDN for a freshly uploaded video's poster frame, which starts its
 * extraction before the first view rather than on it.
 *
 * One try. A frame that is not ready yet is asked for again by whoever views
 * the video next, through the poster endpoint.
 */
export const mediaPosterJob = createJob<string>(
  "mediaPoster",
  {
    perform: async (versionId) => {
      const version = await MediaVersion.query().findById(versionId);
      if (!version) {
        return;
      }
      await probeMediaPoster(version, { timeout: UPLOAD_PROBE_TIMEOUT_MS });
    },
  },
  // Probes mostly wait on the CDN, so several can share a worker.
  { timeout: UPLOAD_PROBE_TIMEOUT_MS * 2, prefetch: 5 },
);
