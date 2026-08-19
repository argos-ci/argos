/**
 * The variants of a journey: the ways one screen was captured.
 *
 * One `argosScreenshot` call can produce a file per viewport, per color scheme
 * and per browser. The canvas draws one screen at a time, so these are what the
 * reader picks between — and only the dimensions that actually vary are worth
 * offering, since a control with one option is a control that does nothing.
 */

export const VARIANT_DIMENSIONS = ["viewport", "browser", "theme"] as const;

export type VariantDimension = (typeof VARIANT_DIMENSIONS)[number];

export type ScreenVariant = Record<VariantDimension, string | null>;

export type VariantSelection = Partial<Record<VariantDimension, string>>;

type ScreenshotLike = {
  metadata?: {
    colorScheme?: string | null;
    viewport?: { width: number } | null;
    browser?: { name: string } | null;
  } | null;
};

/**
 * Read from the metadata rather than from the name: the name is what groups
 * captures into a step, the metadata is what tells them apart. Parsing the
 * same string for both would make one rule depend on the other's spelling.
 */
export function getScreenVariant(screenshot: ScreenshotLike): ScreenVariant {
  const { metadata } = screenshot;
  return {
    viewport: metadata?.viewport ? String(metadata.viewport.width) : null,
    browser: metadata?.browser?.name ?? null,
    theme: metadata?.colorScheme ?? null,
  };
}

export const DIMENSION_LABELS: Record<VariantDimension, string> = {
  viewport: "Viewport",
  browser: "Browser",
  theme: "Theme",
};

export function getValueLabel(
  dimension: VariantDimension,
  value: string,
): string {
  return dimension === "viewport" ? `${value} px` : value;
}

/**
 * The values each dimension takes across a journey, keyed by dimension, with
 * the ones that never vary left out.
 *
 * Counted over steps rather than over files: a journey of eight steps captured
 * at two viewports has two viewport values, not sixteen.
 */
export function getVariantOptions(
  steps: { screenshots: ScreenshotLike[] }[],
): Partial<Record<VariantDimension, string[]>> {
  const seen: Record<VariantDimension, Map<string, number>> = {
    viewport: new Map(),
    browser: new Map(),
    theme: new Map(),
  };

  for (const step of steps) {
    const stepValues: Record<VariantDimension, Set<string>> = {
      viewport: new Set(),
      browser: new Set(),
      theme: new Set(),
    };
    for (const screenshot of step.screenshots) {
      const variant = getScreenVariant(screenshot);
      for (const dimension of VARIANT_DIMENSIONS) {
        const value = variant[dimension];
        if (value !== null) {
          stepValues[dimension].add(value);
        }
      }
    }
    for (const dimension of VARIANT_DIMENSIONS) {
      for (const value of stepValues[dimension]) {
        const counts = seen[dimension];
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
  }

  const options: Partial<Record<VariantDimension, string[]>> = {};
  for (const dimension of VARIANT_DIMENSIONS) {
    const counts = seen[dimension];
    if (counts.size > 1) {
      options[dimension] = [...counts.keys()].sort(
        getValueComparator(dimension, counts),
      );
    }
  }
  return options;
}

/**
 * Puts the value that covers the most steps first, so the default the caller
 * takes off the front never opens on a variant that leaves half the journey
 * blank. Viewports break a tie by width: the widest reads best in a strip.
 */
function getValueComparator(
  dimension: VariantDimension,
  counts: Map<string, number>,
): (a: string, b: string) => number {
  return (a, b) => {
    const byCoverage = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (byCoverage !== 0) {
      return byCoverage;
    }
    if (dimension === "viewport") {
      return Number(b) - Number(a);
    }
    return a.localeCompare(b);
  };
}

/**
 * Whether a capture answers the current selection.
 *
 * A dimension the capture says nothing about matches anything: metadata is
 * missing on older uploads, and hiding a screen because Argos does not know its
 * viewport would turn a gap in the metadata into a gap in the journey.
 */
export function matchesSelection(
  screenshot: ScreenshotLike,
  selection: VariantSelection,
): boolean {
  const variant = getScreenVariant(screenshot);
  return VARIANT_DIMENSIONS.every((dimension) => {
    const wanted = selection[dimension];
    if (wanted === undefined) {
      return true;
    }
    const value = variant[dimension];
    return value === null || value === wanted;
  });
}
