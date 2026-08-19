/**
 * The journey a screenshot belongs to, derived from the metadata the SDK
 * records — nothing to configure on the user's side.
 *
 * A *flow* is the test that took the screenshot: its title path (file ›
 * describe › test) is the identity. Storybook uploads carry a story id
 * instead: stories group by component, one step per story.
 *
 * A *step* is a logical screen, not a file: the viewport, browser and
 * color-scheme variants of one screen collapse into one step, keyed by the
 * backend `variantKey`. Steps follow the capture order recorded by the SDK,
 * and fall back to the alphabetical order of their key when it is missing.
 */

/** The part of a screenshot's metadata the flow model reads. */
export type FlowMetadata = {
  test?: { titlePath: string[] } | null;
  story?: { id: string } | null;
  capture?: { index: number } | null;
} | null;

export type FlowIdentity = {
  /** Stable key, e.g. the joined test title path or a story component id. */
  key: string;
  /** Muted context shown before the title (test file, "storybook"…). */
  prefix: string;
  title: string;
};

/**
 * Strips a trailing color-scheme marker from a test title or describe
 * ("Homepage (dark)", "Homepage dark", "Screenshot pages dark mode"): a suite
 * run twice for theming is one journey whose steps have dark/light variants,
 * not two journeys. A segment that is nothing but a marker ("dark mode")
 * disappears entirely, merging with the run that has no wrapper describe.
 */
function stripSchemeMarker(segment: string): string {
  return segment
    .replace(/\s*\((dark|light)([\s-]+mode)?\)$/i, "")
    .replace(/[\s-]*\b(dark|light)([\s-]+mode)?$/i, "")
    .trim();
}

export function resolveFlowIdentity(
  metadata: FlowMetadata,
): FlowIdentity | null {
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
  const rawTitlePath = metadata?.test?.titlePath;
  if (rawTitlePath && rawTitlePath.length > 0) {
    // Color-scheme markers can sit at any level ("Screenshot pages dark mode"
    // describe, "Screenshots for about (dark)" title): every segment is
    // normalized so both runs resolve to the same journey.
    const titlePath = rawTitlePath
      .map((segment) => stripSchemeMarker(segment.trim()))
      .filter(Boolean);
    const title = titlePath.at(-1);
    if (!title) {
      return null;
    }
    return {
      key: titlePath.join(" › "),
      prefix: titlePath.slice(0, -1).join(" › "),
      title,
    };
  }
  return null;
}

/** Short display label for a step, from its key. */
export function getStepLabel(stepKey: string): string {
  return stepKey.split("/").pop() || stepKey;
}

/**
 * What is left of a screenshot name once its variant key is taken out: the
 * browser prefix, viewport suffix, scheme token… — everything that tells one
 * variant of a screen from another. Two screenshots of different steps with
 * the same signature are the same variant of the journey, which is how the
 * minimap and ⇧←/⇧→ stay on one viewport while moving between steps.
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

export function getCaptureIndex(metadata: FlowMetadata): number | null {
  return metadata?.capture?.index ?? null;
}

/** What `groupJourneys` needs to know about a screenshot or a diff. */
export type JourneySource = {
  variantKey: string;
  metadata: FlowMetadata;
};

type JourneyStep<T> = {
  /** Variant-independent key (the backend `variantKey`). */
  key: string;
  label: string;
  /** Lowest capture index among the variants, null when none was recorded. */
  captureIndex: number | null;
  /** The variants of this screen, in the order they were given. */
  diffs: T[];
};

export type Journey<T> = {
  identity: FlowIdentity;
  steps: JourneyStep<T>[];
};

/**
 * Groups screenshots (or diffs) into the journeys their tests walked: one
 * journey per flow identity, one step per logical screen (`variantKey`), steps
 * in capture order. Items without flow information are left out, and so are
 * journeys of a single screen — a test that captures one screen is regular
 * visual testing, not a journey. Journeys come back sorted by key.
 */
export function groupJourneys<T>(
  items: T[],
  describe: (item: T) => JourneySource,
): Journey<T>[] {
  const journeys = new Map<
    string,
    { identity: FlowIdentity; steps: Map<string, JourneyStep<T>> }
  >();
  for (const item of items) {
    const { variantKey, metadata } = describe(item);
    const identity = resolveFlowIdentity(metadata);
    if (!identity) {
      continue;
    }
    const journey = journeys.get(identity.key) ?? {
      identity,
      steps: new Map(),
    };
    journeys.set(identity.key, journey);
    const step = journey.steps.get(variantKey) ?? {
      key: variantKey,
      label: getStepLabel(variantKey),
      captureIndex: null,
      diffs: [],
    };
    journey.steps.set(variantKey, step);
    step.diffs.push(item);
    const captureIndex = getCaptureIndex(metadata);
    if (captureIndex !== null) {
      step.captureIndex = Math.min(
        step.captureIndex ?? Number.MAX_SAFE_INTEGER,
        captureIndex,
      );
    }
  }
  return [...journeys.values()]
    .map(({ identity, steps }) => ({
      identity,
      steps: [...steps.values()].toSorted(compareSteps),
    }))
    .filter((journey) => journey.steps.length > 1)
    .toSorted((a, b) => a.identity.key.localeCompare(b.identity.key));
}

/**
 * The axes that tell one variant of a screen from another, read from the
 * metadata the SDK records. `null` where the SDK said nothing.
 */
export type VariantDims = {
  browser: string | null;
  /** Viewport width in px. */
  viewport: number | null;
  scheme: "light" | "dark" | null;
};

/** The metadata `getVariantDims` reads. */
export type VariantMetadata = {
  browser?: { name: string } | null;
  viewport?: { width: number } | null;
  colorScheme?: "light" | "dark" | null;
} | null;

export function getVariantDims(metadata: VariantMetadata): VariantDims {
  return {
    browser: metadata?.browser?.name ?? null,
    viewport: metadata?.viewport?.width ?? null,
    scheme: metadata?.colorScheme ?? null,
  };
}

/** Every value each axis takes across a journey — only axes that vary matter. */
export type JourneyDims = {
  browsers: string[];
  /** Ascending. */
  viewports: number[];
  schemes: ("light" | "dark")[];
};

export function getJourneyDims(dims: VariantDims[]): JourneyDims {
  const unique = <V>(values: (V | null)[]) => [
    ...new Set(values.filter((value): value is V => value !== null)),
  ];
  return {
    browsers: unique(dims.map((d) => d.browser)).toSorted(),
    viewports: unique(dims.map((d) => d.viewport)).toSorted((a, b) => a - b),
    schemes: unique(dims.map((d) => d.scheme)).toSorted(),
  };
}

/** A per-axis choice; `null` on an axis means "no preference". */
export type VariantSelection = VariantDims;

/**
 * The default variant of a journey: the largest viewport (the desktop run
 * reads best at a glance), the first browser, light.
 */
export function getDefaultVariantSelection(
  dims: JourneyDims,
): VariantSelection {
  return {
    browser: dims.browsers[0] ?? null,
    viewport: dims.viewports.at(-1) ?? null,
    scheme: dims.schemes.includes("light")
      ? "light"
      : (dims.schemes[0] ?? null),
  };
}

/**
 * Picks, among the variants of one step, the one closest to the selection. A
 * step missing the exact combination still shows its closest variant, so the
 * journey never has a hole: the viewport weighs most (walking a flow on one
 * screen size is what matters), then the browser, then the scheme; ties keep
 * the first.
 */
export function pickVariantByDims<T>(
  variants: T[],
  getDims: (variant: T) => VariantDims,
  selection: VariantSelection,
): T | null {
  let best: { variant: T; score: number } | null = null;
  for (const variant of variants) {
    const dims = getDims(variant);
    let score = 0;
    if (selection.viewport !== null && dims.viewport === selection.viewport) {
      score += 4;
    }
    if (selection.browser !== null && dims.browser === selection.browser) {
      score += 2;
    }
    if (
      selection.scheme !== null &&
      (dims.scheme ?? "light") === selection.scheme
    ) {
      score += 1;
    }
    if (!best || score > best.score) {
      best = { variant, score };
    }
  }
  return best?.variant ?? null;
}
