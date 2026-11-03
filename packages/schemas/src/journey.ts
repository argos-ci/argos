/**
 * The journey a screenshot belongs to, derived from the metadata the SDK
 * records — nothing to configure on the user's side.
 *
 * A *journey* is one run of the test that took the screenshot: its title path
 * (file › describe › test) names it, and the test id tells its runs apart, so
 * a test run by a `desktop` and a `mobile` Playwright project is two journeys.
 * Storybook uploads carry a story id instead: stories group by component, one
 * step per story.
 *
 * A *step* is a logical screen, not a file: the variants a run takes of one
 * screen (viewports, modes) collapse into one step, keyed by the backend
 * `variantKey`.
 * Steps follow the capture order recorded by the SDK, and fall back to the
 * alphabetical order of their key when it is missing.
 */

/** The part of a screenshot's metadata the journey model reads. */
export type JourneyMetadata = {
  test?: { id?: string | null; titlePath: string[] } | null;
  story?: { id: string } | null;
  capture?: { index: number } | null;
} | null;

export type JourneyIdentity = {
  /** Stable key, e.g. the title path and test id, or a story component id. */
  key: string;
  /** Muted context shown before the title (test file, "storybook"…). */
  prefix: string;
  title: string;
};

export function resolveJourneyIdentity(
  metadata: JourneyMetadata,
): JourneyIdentity | null {
  const test = resolveTestIdentity(metadata);
  // The title path is the same in every Playwright project, and the SDK
  // numbers the captures of each run from 0: two runs under one key
  // interleave, desktop and mobile alternating. Playwright and Vitest derive
  // the test id from the project; Cypress sends none.
  const runId = metadata?.story?.id ? null : metadata?.test?.id;
  if (!test || !runId) {
    return test;
  }
  return { ...test, key: `${test.key}#${runId}` };
}

/**
 * The test a screenshot comes from, whichever run took it: the journey with
 * its runs merged, so the snapshot list shows a test run by a `desktop` and a
 * `mobile` project once, with the screenshots of both.
 */
export function resolveTestIdentity(
  metadata: JourneyMetadata,
): JourneyIdentity | null {
  // Story first: Storybook runs through a Playwright test runner, so its
  // screenshots may carry test metadata too — but the journey users care
  // about is the component (one step per story), not the runner's test.
  const storyId = metadata?.story?.id;
  if (storyId) {
    const [component = storyId] = storyId.split("--");
    return {
      key: `storybook › ${component}`,
      prefix: "storybook",
      title: component,
    };
  }
  const titlePath = metadata?.test?.titlePath
    ?.map((segment) => segment.trim())
    .filter(Boolean);
  const title = titlePath?.at(-1);
  if (!titlePath || !title) {
    return null;
  }
  return {
    key: titlePath.join(" › "),
    prefix: titlePath.slice(0, -1).join(" › "),
    title,
  };
}

/** Short display label for a step, from its key. */
export function getStepLabel(stepKey: string): string {
  return stepKey.split("/").pop() || stepKey;
}

/**
 * What is left of a screenshot name once its variant key is taken out: the
 * browser prefix, the viewport suffix… — everything that tells one variant of
 * a screen from another. Two screenshots of different steps with the same
 * signature are the same variant of the journey, which is how the drawer and
 * ⇧←/⇧→ stay on one viewport while moving between steps.
 */
export function getVariantSignature(screenshot: {
  name: string;
  variantKey: string;
}): string {
  return screenshot.name.replace(screenshot.variantKey, "");
}

const LAST = Number.MAX_SAFE_INTEGER;

/**
 * Orders steps: capture order when the SDK recorded it, alphabetical by key
 * otherwise. A step without an index sorts after those that have one.
 */
export function compareSteps(
  a: { key: string; captureIndex: number | null },
  b: { key: string; captureIndex: number | null },
): number {
  return (
    (a.captureIndex ?? LAST) - (b.captureIndex ?? LAST) ||
    a.key.localeCompare(b.key)
  );
}

export function getCaptureIndex(metadata: JourneyMetadata): number | null {
  return metadata?.capture?.index ?? null;
}

export type Journey<T> = {
  identity: JourneyIdentity;
  /** The steps in order, each with the screenshots taken of it (variants). */
  steps: { key: string; captureIndex: number | null; diffs: T[] }[];
};

/**
 * The journeys `items` belong to, in the order they first come in, each with
 * its steps in order. Items without journey information are left out.
 */
export function groupJourneys<T extends { variantKey: string }>(
  items: readonly T[],
  getMetadata: (item: T) => JourneyMetadata,
): Journey<T>[] {
  const journeys = new Map<
    string,
    { identity: JourneyIdentity; steps: Map<string, Journey<T>["steps"][0]> }
  >();
  for (const item of items) {
    const metadata = getMetadata(item);
    const identity = resolveJourneyIdentity(metadata);
    if (!identity) {
      continue;
    }
    const journey = journeys.get(identity.key) ?? {
      identity,
      steps: new Map(),
    };
    journeys.set(identity.key, journey);
    const key = item.variantKey;
    const step = journey.steps.get(key) ?? {
      key,
      captureIndex: null,
      diffs: [],
    };
    journey.steps.set(key, step);
    step.diffs.push(item);
    const captureIndex = getCaptureIndex(metadata);
    if (captureIndex !== null) {
      step.captureIndex = Math.min(step.captureIndex ?? LAST, captureIndex);
    }
  }
  return Array.from(journeys.values(), (journey) => ({
    identity: journey.identity,
    steps: Array.from(journey.steps.values()).toSorted(compareSteps),
  }));
}

/**
 * A test that captures a single screen is regular visual testing: there is no
 * journey to walk.
 */
export function checkIsMultiStepJourney(journey: Journey<unknown>): boolean {
  return journey.steps.length > 1;
}

/**
 * The journeys a reviewer can walk screen by screen: several steps, and not
 * Storybook stories, which group by component: a build already names those on
 * its own (story kind filter, affected components).
 */
export function groupWalkableJourneys<T extends { variantKey: string }>(
  items: readonly T[],
  getMetadata: (item: T) => JourneyMetadata,
): Journey<T>[] {
  return groupJourneys(items, getMetadata).filter(
    (journey) =>
      checkIsMultiStepJourney(journey) &&
      !journey.steps.some((step) =>
        step.diffs.some((item) => getMetadata(item)?.story),
      ),
  );
}

/**
 * The screenshots of `steps` in the order a review walks them: one variant at
 * a time, step by step. A variant is walked whole before the next one, so the
 * screens follow each other on one viewport and scheme, the way someone
 * clicking through the app would see them.
 */
export function walkJourneySteps<
  T extends { name: string; variantKey: string },
>(steps: readonly { diffs: readonly T[] }[]): T[] {
  const variants = new Map<string, T[]>();
  for (const step of steps) {
    for (const item of step.diffs) {
      const signature = getVariantSignature(item);
      const variant = variants.get(signature) ?? [];
      variants.set(signature, variant);
      variant.push(item);
    }
  }
  return Array.from(variants.values()).flat();
}
