#!/usr/bin/env node
import { callbackify } from "node:util";

import { IgnoredFile } from "@/database/models";
import logger from "@/logger";

import { fileFingerprintJob } from "../job";

const main = callbackify(async () => {
  const ignoredFiles = await IgnoredFile.query();

  const fileIds = ignoredFiles.map((ignoredFile) => ignoredFile.fileId);
  await fileFingerprintJob.push(...fileIds);
  logger.info(`${fileIds.length} files pushed in queue`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
