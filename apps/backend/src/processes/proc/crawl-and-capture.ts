import { job as captureJob } from "@/capture/index.js";
import { job as crawlJob } from "@/crawl/index.js";
import { createJobWorker } from "@/job-core/index.js";

import { setup } from "../setup.js";

setup();

createJobWorker(crawlJob);
createJobWorker(captureJob);
