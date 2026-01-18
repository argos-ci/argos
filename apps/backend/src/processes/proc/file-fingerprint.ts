import "../setup";

import { fileFingerprintJob } from "@/file-fingerprint/job";
import { createJobWorker } from "@/job-core";

createJobWorker(fileFingerprintJob);
