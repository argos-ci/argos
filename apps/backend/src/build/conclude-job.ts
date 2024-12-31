import { createJob } from "@/job-core/index.js";
import logger from "@/logger/index.js";

import { concludeBuild } from "./concludeBuild.js";

export const concludeBuildsJob = createJob("conclude-builds", {
  complete: () => {},
  error: (value, error) => {
    console.error("Error while processing build", value, error);
  },
  perform: async (buildId: string) => {
    logger.info(`Concluding build ${buildId}`);
    await concludeBuild({ buildId });
    logger.info(`Build ${buildId} concluded`);
  },
});
