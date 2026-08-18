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
