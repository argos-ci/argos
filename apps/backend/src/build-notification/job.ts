import { BuildNotification } from "@/database/models";
import { createJob } from "@/job-core";

import { processBuildNotification } from "./notifications";

export const job = createJob<string>(
  "build-notification",
  {
    perform: async (buildId) => {
      // Always process the latest non-complete notification for this build.
      // Pushes are deduped by `buildId`, so messages arriving while we work
      // re-enqueue and trigger another pass; notifications inserted after
      // our SELECT (id > latest.id) stay pending for that next pass.
      const latest = await BuildNotification.query()
        .where("buildId", buildId)
        .whereNot("jobStatus", "complete")
        .orderBy("id", "desc")
        .first();

      if (!latest) {
        return;
      }

      await BuildNotification.query()
        .findById(latest.id)
        .patch({ jobStatus: "progress" });

      await processBuildNotification(latest);

      await BuildNotification.query()
        .where("buildId", buildId)
        .where("id", "<=", latest.id)
        .whereNot("jobStatus", "complete")
        .patch({ jobStatus: "complete" });
    },
    error: async (buildId) => {
      // Mark the latest pending notification as errored so it shows up in
      // the retry sweep. Newer notifications stay pending — the next run
      // will pick them up.
      const latest = await BuildNotification.query()
        .where("buildId", buildId)
        .whereNot("jobStatus", "complete")
        .orderBy("id", "desc")
        .first();
      if (latest) {
        await BuildNotification.query()
          .findById(latest.id)
          .patch({ jobStatus: "error" });
      }
    },
  },
  { timeout: 25_000, dedupe: true },
);
