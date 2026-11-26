import { invariant } from "@argos/util/invariant";

type Viewport = { width: number; height: number };

type JourneyRun = {
  id: string;
  prefix: string;
  title: string;
  variants: readonly { browser: string | null; viewport: Viewport | null }[];
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

/** `journeys` by the test they are runs of, in the order they first come in. */
export function groupJourneysByTest<
  J extends Pick<JourneyRun, "prefix" | "title">,
>(journeys: readonly J[]): { key: string; journeys: J[] }[] {
  const tests = new Map<string, J[]>();
  for (const journey of journeys) {
    const key = getJourneyTestKey(journey);
    const runs = tests.get(key) ?? [];
    tests.set(key, runs);
    runs.push(journey);
  }
  return Array.from(tests, ([key, runs]) => ({ key, journeys: runs }));
}

/**
 * Where a run took its screenshots: its first variant's. A run taken at
 * several sizes (Argos's `viewports` option) goes by the first.
 */
export function getRunCapture(journey: Pick<JourneyRun, "variants">) {
  const [first] = journey.variants;
  invariant(first, "a journey has a variant");
  return first;
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
  const hints = new Map<string, JourneyRunHint>();
  for (const test of groupJourneysByTest(journeys)) {
    const captures = test.journeys.map(getRunCapture);
    const browserDiffers =
      new Set(captures.map((capture) => capture.browser)).size > 1;
    const viewportDiffers =
      new Set(
        captures.map((capture) =>
          capture.viewport
            ? `${capture.viewport.width}x${capture.viewport.height}`
            : null,
        ),
      ).size > 1;
    test.journeys.forEach((journey, index) => {
      const capture = captures[index];
      invariant(capture, "a capture per run");
      hints.set(journey.id, {
        browser: browserDiffers ? capture.browser : null,
        viewport: viewportDiffers ? capture.viewport : null,
      });
    });
  }
  return hints;
}

/** Whether `diffId` is one of a journey's screenshots, in any variant. */
export function checkIsJourneyDiff(
  journey: { variants: readonly { diffIds: readonly (string | null)[] }[] },
  diffId: string,
): boolean {
  return journey.variants.some((variant) => variant.diffIds.includes(diffId));
}

/** How many screenshots a journey has, in every variant. */
export function countJourneyDiffs(journey: {
  variants: readonly { diffIds: readonly (string | null)[] }[];
}): number {
  return journey.variants.reduce(
    (count, variant) =>
      count + variant.diffIds.filter((diffId) => diffId !== null).length,
    0,
  );
}
