import { invariant } from "@argos/util/invariant";

type Viewport = { width: number; height: number };

type JourneyRun = {
  id: string;
  prefix: string;
  title: string;
  variants: readonly { browser: string | null; viewport: Viewport | null }[];
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
