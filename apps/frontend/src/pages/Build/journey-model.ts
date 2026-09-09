/**
 * The journey a screenshot belongs to, derived from the metadata the SDK
 * records — nothing to configure on the user's side.
 *
 * A *journey* is the test that took the screenshot: its title path (file ›
 * describe › test) is the identity. Storybook uploads carry a story id
 * instead: stories group by component, one step per story.
 *
 * A *step* is a logical screen, not a file: the viewport and browser variants
 * of one screen collapse into one step, keyed by the backend `variantKey`.
 * Steps follow the capture order recorded by the SDK, and fall back to the
 * alphabetical order of their key when it is missing.
 */

/** The part of a screenshot's metadata the journey model reads. */
export type JourneyMetadata = {
  test?: { titlePath: string[] } | null;
  story?: { id: string } | null;
  capture?: { index: number } | null;
} | null;

export type JourneyIdentity = {
  /** Stable key, e.g. the joined test title path or a story component id. */
  key: string;
  /** Muted context shown before the title (test file, "storybook"…). */
  prefix: string;
  title: string;
};

export function resolveJourneyIdentity(
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
  if (titlePath && titlePath.length > 0) {
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
