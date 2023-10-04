import { createJobWorker } from "@/job-core/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";

import { setup } from "../setup.js";

setup();

createJobWorker(screenshotDiffJob);
