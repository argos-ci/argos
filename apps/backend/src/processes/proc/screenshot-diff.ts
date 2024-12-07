import "../setup.js";

import { createJobWorker } from "@/job-core/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";

createJobWorker(screenshotDiffJob);
