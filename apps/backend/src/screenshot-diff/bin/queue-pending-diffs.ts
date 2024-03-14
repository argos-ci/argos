#!/usr/bin/env node
import { callbackify } from "node:util";

import { ScreenshotDiff } from "@/database/models/index.js";
import logger from "@/logger/index.js";

import { job as diffJob } from "../job.js";

const main = callbackify(async () => {
  const diffs = await ScreenshotDiff.query()
    .where({ jobStatus: "pending" })
    .whereRaw(`"createdAt" > now() - interval '1 hour'`)
    .orderBy("id", "desc");
  const diffIds = diffs.map((diff) => diff.id);
  await diffJob.push(...diffIds);
  logger.info(`${diffs.length} diffs pushed in queue`);
});

main((err) => {
  if (err) throw err;
});
