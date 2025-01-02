#!/usr/bin/env node
import { callbackify } from "node:util";

import { Build } from "@/database/models/index.js";
import logger from "@/logger/index.js";

import { buildReviewJob } from "../build-review-job.js";

const main = callbackify(async () => {
  const batch = 2000;
  const totalCount = await Build.query()
    .where("conclusion", "changes-detected")
    .resultSize();

  let total = 0;
  for (let offset = 0; offset < totalCount; offset += batch) {
    const nodes = await Build.query()
      .select("id")
      .where("conclusion", "changes-detected")
      .limit(batch)
      .offset(offset)
      .orderBy("id", "desc");

    const ids = nodes.map((node) => node.id);
    const percentage = Math.round((total / totalCount) * 100);
    logger.info(
      `Processing ${total}/${totalCount} (${percentage}%) - Pushing ${ids.length} builds in queue`,
    );
    await buildReviewJob.push(...ids);
    total += nodes.length;
  }

  logger.info(`${total} builds pushed in queue (100% complete)`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
