import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models";
import { UnretryableError } from "@/job-core";

import { CIStrategy } from "./strategies/ci";
import { MonitoringStrategy } from "./strategies/monitoring";
import { BuildStrategy } from "./types";

const strategies: BuildStrategy<any>[] = [CIStrategy, MonitoringStrategy];

export function getBuildStrategy(build: Build) {
  const strategy = strategies.find((s) => s.detect(build));
  invariant(strategy, "No strategy found", UnretryableError);
  return strategy;
}

export type { BuildStrategy };
