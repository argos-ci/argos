import "../setup.js";

import { buildReviewJob } from "@/build/build-review-job.js";
import { createJobWorker } from "@/job-core/index.js";

createJobWorker(buildReviewJob);
