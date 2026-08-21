import { createJob } from "@/job-core";

import { synchronizeOriginInstallation } from "./synchronize";

/**
 * Reconcile an installation's repositories off the request.
 *
 * The reconciliation pages through every repository the installation reaches,
 * so it does not belong in the webhook handler or the install callback: a
 * namespace large enough to outlast the lock's budget would fail the delivery
 * (and have it redelivered forever) or 500 the admin's browser. Same shape as
 * the GitHub side, which only enqueues a synchronization.
 */
export const originInstallationSyncJob = createJob<string>(
  "originInstallationSync",
  {
    perform: async (installationId) => {
      await synchronizeOriginInstallation(installationId);
    },
  },
  { timeout: 120_000 },
);
