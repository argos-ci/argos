type Screenshot =
  | {
      metadata?: {
        browser?: { name: string; version: string } | null;
      } | null;
    }
  | null
  | undefined;

type ComparedScreenshots = {
  baseScreenshot?: Screenshot;
  compareScreenshot?: Screenshot;
};

export type BrowserVersionChange = {
  name: string;
  baseVersion: string;
  compareVersion: string;
};

export function getDiffBrowserVersionChange(
  diff: ComparedScreenshots,
): BrowserVersionChange | null {
  const base = diff.baseScreenshot?.metadata?.browser;
  const compare = diff.compareScreenshot?.metadata?.browser;
  if (
    !base ||
    !compare ||
    base.name !== compare.name ||
    base.version === compare.version
  ) {
    return null;
  }
  return {
    name: compare.name,
    baseVersion: base.version,
    compareVersion: compare.version,
  };
}

const compareNatural = new Intl.Collator(undefined, { numeric: true }).compare;

/** The distinct browser version changes across the diffs of a build. */
export function getBrowserVersionChanges(
  diffs: ComparedScreenshots[],
): BrowserVersionChange[] {
  const changes = new Map<string, BrowserVersionChange>();
  for (const diff of diffs) {
    const change = getDiffBrowserVersionChange(diff);
    if (change) {
      changes.set(getBrowserVersionChangeKey(change), change);
    }
  }
  return Array.from(changes.values()).sort(
    (a, b) =>
      compareNatural(a.name, b.name) ||
      compareNatural(a.baseVersion, b.baseVersion) ||
      compareNatural(a.compareVersion, b.compareVersion),
  );
}

export function getBrowserVersionChangeKey(
  change: BrowserVersionChange,
): string {
  return `${change.name} ${change.baseVersion} ${change.compareVersion}`;
}
