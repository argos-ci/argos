import { Synchronization } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";

import { synchronize } from "./synchronizer.js";

export const job = createModelJob("synchronize", Synchronization, synchronize);
