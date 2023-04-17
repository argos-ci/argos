import { job as captureJob } from "@argos-ci/capture";
import { job as crawlJob } from "@argos-ci/crawl";
import { createJobWorker } from "@argos-ci/job-core";

import { setup } from "../setup.js";

setup();

createJobWorker(crawlJob);
createJobWorker(captureJob);
