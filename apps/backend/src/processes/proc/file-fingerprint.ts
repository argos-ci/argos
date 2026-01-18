import { fileFingerprintJob } from "@/file-fingerprint/job";

import "../setup";

import { createJobWorker } from "@/job-core";

createJobWorker(fileFingerprintJob);
