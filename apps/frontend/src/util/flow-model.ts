/**
 * Flow model shared by the build review sidebar and the Flows pages.
 *
 * A flow is any test that took at least one screenshot: the test titlePath
 * (file › describe › test) is the flow identity — no metadata to add, no
 * configuration. Storybook uploads carry a story id instead: stories group
 * by component, one step per story.
 *
 * Steps are logical screens: viewport / browser / mode variants of the same
 * screenshot collapse into one step (same normalization as the backend
 * `variantKey`). Step order resolves through a chain: manual curation first,
 * then the SDK capture index when present, then alphabetical.
 */

/** Minimal shape needed to derive flow information from a screenshot. */
export type FlowSource = {
  name: string;
  metadata?: {
    test?: { titlePath: string[] } | null;
    story?: { id: string } | null;
    capture?: { index: number } | null;
  } | null;
};

export type FlowIdentity = {
  /** Stable key, e.g. the joined test titlePath or a story component id. */
  key: string;
  /** Muted context shown before the title (test file, "storybook"…). */
  prefix: string;
  title: string;
};

export function resolveFlowIdentity(source: FlowSource): FlowIdentity | null {
  const titlePath = source.metadata?.test?.titlePath;
  if (titlePath && titlePath.length > 0) {
    return {
      key: titlePath.join(" › "),
      prefix: titlePath.slice(0, -1).join(" › "),
      title: titlePath.at(-1) as string,
    };
  }
  const storyId = source.metadata?.story?.id;
  if (storyId) {
    const [component] = storyId.split("--");
    return {
      key: `storybook › ${component}`,
      prefix: "storybook",
      title: component as string,
    };
  }
  return null;
}

/**
 * Same normalization as the backend `getVariantKey`: browser prefix,
 * repeat / viewport / mode suffixes and failure markers are stripped so all
 * variants of one logical screen share a step key.
 */
export function getStepKey(name: string): string {
  return name
    .replace(/^(chromium|firefox|safari|chrome)\//, "")
    .replace(/\s+repeat-\d+(?=\.|$)/, "")
    .replace(/\s*mode-\[[^[\]]+\]\.png$/, "")
    .replace(/\s+vw-\d+\.png$/, "")
    .replace(/ #\d+ \(failed\)\.png$/, "")
    .replace(/\.png$/, "")
    .trim();
}

/** Short display label for a step, from its key. */
export function getStepLabel(stepKey: string): string {
  return stepKey.split("/").pop() || stepKey;
}

/** Human label of the variant a screenshot name carries ("1280px", "firefox"…). */
export function getVariantLabel(name: string): string {
  const parts: string[] = [];
  const browser = name.match(/^(chromium|firefox|safari|chrome)\//);
  if (browser?.[1]) {
    parts.push(browser[1]);
  }
  const viewport = name.match(/\svw-(\d+)\.png$/);
  if (viewport?.[1]) {
    parts.push(`${viewport[1]}px`);
  }
  const mode = name.match(/\smode-\[([^[\]]+)\]\.png$/);
  if (mode?.[1]) {
    parts.push(mode[1]);
  }
  return parts.join(" · ") || "default";
}

const LAST = Number.MAX_SAFE_INTEGER;

/**
 * Orders step keys: curated order first (when stored), then the SDK capture
 * index, then alphabetical. The stored order references step keys; unknown
 * keys (new steps) fall through to the automatic chain.
 */
export function compareSteps(
  a: { key: string; captureIndex: number | null },
  b: { key: string; captureIndex: number | null },
  storedOrder: string[] | undefined,
): number {
  const rank = (step: { key: string }) => {
    const index = storedOrder?.indexOf(step.key) ?? -1;
    return index === -1 ? LAST : index;
  };
  return (
    rank(a) - rank(b) ||
    (a.captureIndex ?? LAST) - (b.captureIndex ?? LAST) ||
    a.key.localeCompare(b.key)
  );
}

export function getCaptureIndex(source: FlowSource): number | null {
  return source.metadata?.capture?.index ?? null;
}
