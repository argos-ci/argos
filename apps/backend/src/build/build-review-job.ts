import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models/Build.js";
import { BuildReview } from "@/database/models/BuildReview.js";
import { createJob } from "@/job-core/index.js";
import logger from "@/logger/index.js";

export const buildReviewJob = createJob("build-reviews", {
  complete: () => {},
  error: (value, error) => {
    console.error("Error while processing build", value, error);
  },
  perform: async (buildId: string) => {
    logger.info(`[${buildId}] Processing for review`);
    const build = await Build.query().findById(buildId).throwIfNotFound();
    const [[status], review] = await Promise.all([
      Build.getReviewStatuses([build]),
      BuildReview.query().select("id").where("buildId", build.id).first(),
    ]);
    if (review) {
      logger.info(`[${buildId}] Review already exists`);
      return;
    }
    invariant(status !== undefined, "Status should be defined");
    if (status) {
      logger.info(`[${buildId}] Review created`);
      const state = (() => {
        switch (status) {
          case "accepted":
            return "approved" as const;
          case "rejected":
            return "rejected" as const;
          default:
            assertNever(status);
        }
      })();

      // Simulate 10 minutes after build creation
      const date = new Date(
        new Date(build.createdAt).getTime() + 10 * 60 * 1000,
      ).toISOString();

      await BuildReview.query().insert({
        buildId: build.id,
        createdAt: date,
        updatedAt: date,
        state,
      });
      logger.info(`[${buildId}] Review created ${state}`);
    } else {
      logger.info(`[${buildId}] No review needed`);
    }
  },
});
