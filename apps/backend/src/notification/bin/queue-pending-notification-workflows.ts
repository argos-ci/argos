#!/usr/bin/env node
import { callbackify } from "node:util";

import { NotificationWorkflow } from "@/database/models";
import logger from "@/logger";

import { notificationWorkflowJob } from "../workflow-job";

const main = callbackify(async () => {
  const nodes = await NotificationWorkflow.query()
    .where((qb) => {
      qb.where({ jobStatus: "error" })
        // A workflow stuck in "pending" has been persisted but its push to
        // the queue failed right after.
        .orWhere((pendingQb) => {
          pendingQb
            .where({ jobStatus: "pending" })
            .whereRaw(`"createdAt" < now() - interval '5 minutes'`);
        });
    })
    .whereRaw(`"createdAt" > now() - interval '2 hour'`)
    .orderBy("id", "desc");
  const ids = nodes.map((node) => node.id);
  await notificationWorkflowJob.push(...ids);
  logger.info(`${nodes.length} pushed in queue`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
