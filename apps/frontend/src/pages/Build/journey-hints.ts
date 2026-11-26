type Viewport = { width: number; height: number };

type JourneyRun = {
  id: string;
  prefix: string;
  title: string;
  browser: string | null;
  viewport: Viewport | null;
};

export type JourneyRunHint = {
  browser: string | null;
  viewport: Viewport | null;
};

/**
 * The test a journey is a run of, shared by its runs in other projects: its
 * title path, the name the build's affected tests go by.
 */
export function getJourneyTestKey(
  journey: Pick<JourneyRun, "prefix" | "title">,
): string {
  return journey.prefix
    ? `${journey.prefix} › ${journey.title}`
    : journey.title;
}

/**
 * What tells apart the runs of one test, by journey id. A test run by several
 * Playwright projects is a journey per project, and projects differ by
 * browser, by viewport or both: only what differs among the runs of a test is
 * kept, so a test run once gets no hint.
 */
export function getJourneyRunHints(
  journeys: readonly JourneyRun[],
): Map<string, JourneyRunHint> {
  const runsByTest = new Map<string, JourneyRun[]>();
  for (const journey of journeys) {
    const testKey = getJourneyTestKey(journey);
    const runs = runsByTest.get(testKey) ?? [];
    runsByTest.set(testKey, runs);
    runs.push(journey);
  }
  const hints = new Map<string, JourneyRunHint>();
  for (const runs of runsByTest.values()) {
    const browserDiffers = new Set(runs.map((run) => run.browser)).size > 1;
    const viewportDiffers =
      new Set(
        runs.map((run) =>
          run.viewport ? `${run.viewport.width}x${run.viewport.height}` : null,
        ),
      ).size > 1;
    for (const run of runs) {
      hints.set(run.id, {
        browser: browserDiffers ? run.browser : null,
        viewport: viewportDiffers ? run.viewport : null,
      });
    }
  }
  return hints;
}

/** The screenshot diffs of a journey, in every variant. */
export function getJourneyDiffIds(journey: {
  variants: readonly { diffIds: readonly (string | null)[] }[];
}): string[] {
  return journey.variants.flatMap((variant) =>
    variant.diffIds.filter((diffId) => diffId !== null),
  );
}
