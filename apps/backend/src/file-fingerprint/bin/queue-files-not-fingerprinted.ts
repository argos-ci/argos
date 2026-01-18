#!/usr/bin/env node
import { callbackify } from "node:util";

import { File } from "@/database/models";
import logger from "@/logger";

import { fileFingerprintJob } from "../job";

const main = callbackify(async () => {
  const files = await File.query()
    .select("id")
    .orderBy("id", "desc")
    .where("type", "screenshotDiff")
    .whereNull("fingerprint")
    .whereRaw(`"createdAt" > now() - interval '3 months'`);

  await fileFingerprintJob.push(...files.map((file) => file.id));
  logger.info(`${files.length} files pushed in queue`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
