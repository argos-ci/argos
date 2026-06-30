import { raw } from "objection";

import { Screenshot, ScreenshotDiff, type Build } from "@/database/models";

type BuildImpactItem = {
  name: string;
  count: number;
};

export type BuildImpactAnalysis = {
  changedCount: number;
  uniqueChangeCount: number;
  changedBrowsers: string[];
  buildBrowsers: string[];
  changedColorSchemes: string[];
  buildColorSchemes: string[];
  buildViewports: string[];
  buildAutomationLibraries: string[];
  affectedComponents: BuildImpactItem[];
  affectedStories: BuildImpactItem[];
  affectedTests: BuildImpactItem[];
};

type ChangedRow = {
  group: string | null;
  browser: string | null;
  colorScheme: string | null;
};

type AffectedRow = {
  storyId: string | null;
  testTitle: string | null;
};

type BucketRow = {
  browser: string | null;
  colorScheme: string | null;
  viewportWidth: string | null;
  viewportHeight: string | null;
  automationLibrary: string | null;
};

function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== null))).sort();
}

/**
 * Distinct viewport sizes formatted as "width×height", ordered from smallest
 * to largest area (mobile → desktop).
 */
function distinctViewports(rows: BucketRow[]): string[] {
  const viewports = new Map<string, number>();
  for (const row of rows) {
    const width = row.viewportWidth ? Number(row.viewportWidth) : NaN;
    const height = row.viewportHeight ? Number(row.viewportHeight) : NaN;
    if (Number.isFinite(width) && Number.isFinite(height)) {
      viewports.set(`${width}×${height}`, width * height);
    }
  }
  return Array.from(viewports)
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label);
}

function countByName(values: (string | null)[]): BuildImpactItem[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value !== null) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/**
 * Extract the component part of a Storybook story id
 * (e.g. "components-actions-button--primary" → "components-actions-button").
 */
function getStoryComponent(storyId: string): string {
  const separatorIndex = storyId.indexOf("--");
  return separatorIndex === -1 ? storyId : storyId.slice(0, separatorIndex);
}

/**
 * Aggregate the metadata of changed screenshots to surface insights to the
 * reviewer: which browsers, color schemes, components and stories are
 * affected, and how many unique changes there are.
 */
export async function getBuildImpactAnalysis(
  build: Build,
): Promise<BuildImpactAnalysis> {
  const [changedRows, affectedRows, bucketRows] = await Promise.all([
    ScreenshotDiff.query()
      .where("screenshot_diffs.buildId", build.id)
      .whereNotNull("screenshot_diffs.baseScreenshotId")
      .whereNotNull("screenshot_diffs.compareScreenshotId")
      .where("screenshot_diffs.score", ">", 0)
      .where("screenshot_diffs.ignored", false)
      .joinRelated("compareScreenshot")
      .select(
        "screenshot_diffs.group",
        raw(`"compareScreenshot"."metadata"->'browser'->>'name'`).as("browser"),
        raw(`"compareScreenshot"."metadata"->>'colorScheme'`).as("colorScheme"),
      )
      .castTo<ChangedRow[]>(),
    // Components/tests impacted by the build: changed screenshots AND brand-new
    // (added) ones. Added screenshots have no base, so they're excluded from
    // `changedRows`, but they still affect their component/test.
    ScreenshotDiff.query()
      .where("screenshot_diffs.buildId", build.id)
      .whereNotNull("screenshot_diffs.compareScreenshotId")
      .where("screenshot_diffs.ignored", false)
      .where((qb) =>
        qb
          .whereNull("screenshot_diffs.baseScreenshotId")
          .orWhere("screenshot_diffs.score", ">", 0),
      )
      .joinRelated("compareScreenshot")
      .select(
        raw(`"compareScreenshot"."metadata"->'story'->>'id'`).as("storyId"),
        raw(`"compareScreenshot"."metadata"->'test'->>'title'`).as("testTitle"),
      )
      .castTo<AffectedRow[]>(),
    Screenshot.query()
      .where("screenshotBucketId", build.compareScreenshotBucketId)
      .distinct(
        raw(`"metadata"->'browser'->>'name'`).as("browser"),
        raw(`"metadata"->>'colorScheme'`).as("colorScheme"),
        raw(`"metadata"->'viewport'->>'width'`).as("viewportWidth"),
        raw(`"metadata"->'viewport'->>'height'`).as("viewportHeight"),
        raw(`"metadata"->'automationLibrary'->>'name'`).as("automationLibrary"),
      )
      .castTo<BucketRow[]>(),
  ]);

  // Diffs sharing a group are the same visual change; ungrouped diffs each
  // count as their own change.
  const groups = new Set<string>();
  let ungroupedCount = 0;
  for (const row of changedRows) {
    if (row.group) {
      groups.add(row.group);
    } else {
      ungroupedCount++;
    }
  }

  const affectedStoryIds = affectedRows.map((row) => row.storyId);

  return {
    changedCount: changedRows.length,
    uniqueChangeCount: groups.size + ungroupedCount,
    changedBrowsers: distinct(changedRows.map((row) => row.browser)),
    buildBrowsers: distinct(bucketRows.map((row) => row.browser)),
    changedColorSchemes: distinct(changedRows.map((row) => row.colorScheme)),
    buildColorSchemes: distinct(bucketRows.map((row) => row.colorScheme)),
    buildViewports: distinctViewports(bucketRows),
    buildAutomationLibraries: distinct(
      bucketRows.map((row) => row.automationLibrary),
    ),
    affectedComponents: countByName(
      affectedStoryIds.map((storyId) =>
        storyId !== null ? getStoryComponent(storyId) : null,
      ),
    ),
    affectedStories: countByName(affectedStoryIds),
    affectedTests: countByName(affectedRows.map((row) => row.testTitle)),
  };
}
