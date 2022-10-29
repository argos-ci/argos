import type { Synchronization } from "@argos-ci/database/models";

import { GitHubSynchronizer } from "./github/synchronizer.js";

export async function synchronize(synchronization: Synchronization) {
  const synchronizer = new GitHubSynchronizer(synchronization);
  await synchronizer.synchronize();
}
