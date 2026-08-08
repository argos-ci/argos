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

export function resolveFlowIdentity(source: FlowSource): FlowIdentity | null {
  // Story first: Storybook runs through a Playwright test runner, so its
  // screenshots may carry test metadata too — but the journey users care
  // about is the component (one step per story), not the runner's test.
  const storyId = source.metadata?.story?.id;
  if (storyId) {
    const [component] = storyId.split("--");
    return {
      key: `storybook › ${component}`,
      prefix: "storybook",
      title: component as string,
    };
  }
  const rawTitlePath = source.metadata?.test?.titlePath;
  if (rawTitlePath && rawTitlePath.length > 0) {
    // Color-scheme markers can sit at any level ("Screenshot pages dark mode"
    // describe, "Screenshots for about (dark)" title): every segment is
    // normalized so both runs resolve to the same journey.
    const titlePath = rawTitlePath
      .map((segment) => stripSchemeMarker(segment.trim()))
      .filter(Boolean);
    const title = titlePath.at(-1) ?? "";
    const prefix = titlePath.slice(0, -1).join(" › ");
    if (!title) {
      return null;
    }
    return { key: titlePath.join(" › "), prefix, title };
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
    .replace(/[\s-]+(dark|light)$/i, "")
    .trim();
}

/** Short display label for a step, from its key. */
export function getStepLabel(stepKey: string): string {
  return stepKey.split("/").pop() || stepKey;
}

/**
 * The independent axes a screenshot name can carry. `scheme` is only the
 * explicit token: a name without one is the light run when a dark sibling
 * exists, but that resolution needs the whole flow, not one name.
 */
export type VariantDims = {
  browser: string | null;
  /** Viewport width in px. */
  viewport: number | null;
  scheme: "dark" | "light" | null;
  mode: string | null;
};

export function getVariantDims(name: string): VariantDims {
  const browser =
    name.match(/^(chromium|firefox|safari|chrome)\//)?.[1] ?? null;
  const viewport = name.match(/\svw-(\d+)\.png$/)?.[1];
  const mode = name.match(/\smode-\[([^[\]]+)\]\.png$/)?.[1] ?? null;
  const scheme = name
    .replace(/\s+vw-\d+\.png$/, "")
    .replace(/\.png$/, "")
    .match(/[\s-](dark|light)$/i)?.[1]
    ?.toLowerCase() as VariantDims["scheme"];
  return {
    browser,
    viewport: viewport ? Number(viewport) : null,
    scheme: scheme ?? null,
    mode,
  };
}

/** Human label of the variant a screenshot name carries ("1280px", "firefox"…). */
export function getVariantLabel(name: string): string {
  const dims = getVariantDims(name);
  const parts = [
    dims.browser,
    dims.viewport ? `${dims.viewport}px` : null,
    dims.mode,
    dims.scheme,
  ].filter(Boolean);
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
