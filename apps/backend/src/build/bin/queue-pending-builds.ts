#!/usr/bin/env node
import { callbackify } from "node:util";

import { Build } from "@/database/models/index.js";
import logger from "@/logger/index.js";

import { job as buildJob } from "../job.js";

const main = callbackify(async () => {
  const builds = await Build.query()
    .where({ jobStatus: "pending" })
    .whereRaw(`"createdAt" > now() - interval '1 hour'`)
    .orderBy("id", "desc");
  const buildIds = builds.map((build) => build.id);
  await buildJob.push(...buildIds);
  logger.info(`${builds.length} builds pushed in queue`);
});

main((err) => {
  if (err) throw err;
});
