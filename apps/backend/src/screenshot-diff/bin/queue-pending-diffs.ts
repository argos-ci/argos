#!/usr/bin/env node
import { callbackify } from "node:util";

import { ScreenshotDiff } from "@/database/models";
import logger from "@/logger";

import { job as diffJob } from "../job";

const main = callbackify(async () => {
  const diffs = await ScreenshotDiff.query()
    .where({ jobStatus: "error" })
    .whereRaw(`"createdAt" > now() - interval '1 day'`)
    .orderBy("id", "desc");
  const diffIds = diffs.map((diff) => diff.id);
  await diffJob.push(...diffIds);
  logger.info(`${diffs.length} diffs pushed in queue`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
