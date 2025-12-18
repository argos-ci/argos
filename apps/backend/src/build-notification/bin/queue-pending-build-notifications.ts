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
  const ids = nodes.map((node) => node.id);
  await job.push(...ids);
  logger.info(`${nodes.length} pushed in queue`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
