import "../setup";

import { createJobWorker } from "@/job-core";
import { job as screenshotDiffJob } from "@/screenshot-diff";

createJobWorker(screenshotDiffJob);
