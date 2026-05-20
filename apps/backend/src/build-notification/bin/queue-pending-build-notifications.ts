#!/usr/bin/env node
import { callbackify } from "node:util";

import { BuildNotification } from "@/database/models";
import logger from "@/logger";

import { job } from "../job";

const main = callbackify(async () => {
  const nodes = await BuildNotification.query()
    .where({ jobStatus: "error" })
    .whereRaw(`"createdAt" > now() - interval '2 hour'`)
    .orderBy("id", "desc");
  const buildIds = [...new Set(nodes.map((node) => node.buildId))];
  await job.push(...buildIds);
  logger.info(
    `${nodes.length} errored notifications across ${buildIds.length} builds pushed in queue`,
  );
});

main((err) => {
  if (err) {
    throw err;
  }
});
