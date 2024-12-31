import "../setup.js";

import { concludeBuildsJob } from "@/build/conclude-job.js";
import { createJobWorker } from "@/job-core/index.js";

createJobWorker(concludeBuildsJob);
