import { readFileSync, writeFileSync } from "node:fs";
import type {
  FullConfig,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestRun,
} from "@playwright/test/reporter";

const DURATIONS_FILE = new URL("./durations.json", import.meta.url);

type Durations = Record<string, number>;

/** A test, or a suite whose tests have to run together in one worker. */
type Unit = { key: string; tests: TestCase[]; target: TestCase | Suite };

function readDurations(): Durations {
  return JSON.parse(readFileSync(DURATIONS_FILE, "utf8")) as Durations;
}

/** The test's file and title path, the key `durations.json` uses. */
function getKey(target: TestCase | Suite): string {
  // The first two entries are the root suite and the project.
  return target.titlePath().slice(2).join(" › ");
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 1;
}

/**
 * Split a suite's tests into units that can run in different shards: single
 * tests, except where a suite runs its tests in order in one worker.
 */
function getUnits(suite: Suite, testRun: TestRun): Unit[] {
  return [
    ...suite.suites.flatMap((child) =>
      testRun.mode(child) === "parallel"
        ? getUnits(child, testRun)
        : [{ key: getKey(child), tests: child.allTests(), target: child }],
    ),
    ...suite.tests.map((test) => ({
      key: getKey(test),
      tests: [test],
      target: test,
    })),
  ];
}

/**
 * Splits the tests between shards by how long they took rather than by count,
 * as Playwright does. In file order, the build specs alone made one shard
 * twice as long as the others. Each unit, longest first, goes to the shard
 * with the least work so far; every shard computes the same plan.
 *
 * Durations come from `durations.json`, a test missing from it counts as the
 * median. Refresh it with a full run:
 * `UPDATE_E2E_DURATIONS=1 NODE_ENV=test pnpm test:e2e --project=chromium`.
 */
export default class ShardBalancer implements Reporter {
  private recorded: Durations = {};

  async preprocess(params: {
    config: FullConfig;
    suite: Suite;
    testRun: TestRun;
  }): Promise<void> {
    const { config, suite, testRun } = params;
    if (!config.shard) {
      return;
    }
    testRun.skipSharding();

    const durations = readDurations();
    const fallback = median(Object.values(durations));
    const dependencies = new Set(
      config.projects.flatMap((project) => project.dependencies),
    );
    const units = suite.suites
      .filter((project) => !dependencies.has(project.title))
      .flatMap((project) => getUnits(project, testRun))
      .map((unit) => ({
        ...unit,
        cost: unit.tests.reduce(
          (sum, test) => sum + (durations[getKey(test)] ?? fallback),
          0,
        ),
      }))
      .toSorted((a, b) => b.cost - a.cost || a.key.localeCompare(b.key));

    const loads = Array.from({ length: config.shard.total }, () => 0);
    const current = config.shard.current - 1;
    let kept = 0;
    for (const unit of units) {
      const shard = loads.indexOf(Math.min(...loads));
      loads[shard] = (loads[shard] ?? 0) + unit.cost;
      if (shard === current) {
        kept += unit.tests.length;
      } else {
        testRun.exclude(unit.target);
      }
    }

    // Playwright reports a run with every test excluded as a success.
    if (units.length > 0 && kept === 0) {
      throw new Error(
        `Shard ${config.shard.current}/${config.shard.total} got no tests. Use fewer shards.`,
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (process.env["UPDATE_E2E_DURATIONS"] && result.status === "passed") {
      this.recorded[getKey(test)] = Math.round(result.duration / 100) / 10;
    }
  }

  onEnd(): void {
    if (!process.env["UPDATE_E2E_DURATIONS"]) {
      return;
    }
    const durations = { ...readDurations(), ...this.recorded };
    const sorted = Object.fromEntries(
      Object.entries(durations).toSorted(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(DURATIONS_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  }

  printsToStdio(): boolean {
    return false;
  }
}
