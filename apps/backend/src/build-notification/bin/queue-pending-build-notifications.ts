#!/usr/bin/env node
import { callbackify } from "node:util";

import { BuildNotification } from "@/database/models/index.js";
import logger from "@/logger/index.js";

import { job } from "../job.js";

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
  if (err) throw err;
});
