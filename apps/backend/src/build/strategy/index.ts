import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { CIStrategy } from "./strategies/ci/index.js";
import { MonitoringStrategy } from "./strategies/monitoring/index.js";
import { BuildStrategy } from "./types.js";

const strategies: BuildStrategy<any>[] = [CIStrategy, MonitoringStrategy];

export function getBuildStrategy(build: Build) {
  const strategy = strategies.find((s) => s.detect(build));
  invariant(strategy, "No strategy found", UnretryableError);
  return strategy;
}

export type { BuildStrategy };
