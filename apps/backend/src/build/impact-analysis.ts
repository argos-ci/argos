import { raw } from "objection";

import {
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  type Build,
} from "@/database/models";

import { getPreviousDiffApprovalIds } from "./approval";

/** Source location of a test in its repository. */
type ImpactItemLocation = {
  file: string;
  line: number;
  column: number;
};

type BuildImpactItem = {
  name: string;
  count: number;
  location?: ImpactItemLocation | null;
};

/** The single most-changed entity of a build, with its diff score. */
type BuildImpactChange = {
  name: string;
  score: number;
};

export type BuildImpactAnalysis = {
  changedCount: number;
  uniqueChangeCount: number;
  changedBrowsers: string[];
  buildBrowsers: string[];
  changedColorSchemes: string[];
  buildColorSchemes: string[];
  changedViewports: string[];
  buildViewports: string[];
  buildAutomationLibraries: string[];
  largestChange: BuildImpactChange | null;
  previouslyApprovedCount: number;
  affectedComponents: BuildImpactItem[];
  affectedStories: BuildImpactItem[];
  affectedTests: BuildImpactItem[];
};

type ChangedRow = {
  group: string | null;
  browser: string | null;
  colorScheme: string | null;
  viewportWidth: string | null;
  viewportHeight: string | null;
  score: number | null;
  storyId: string | null;
  testTitle: string | null;
  testTitlePath: string[] | null;
  name: string | null;
};

type AffectedRow = {
  storyId: string | null;
  testTitle: string | null;
  testTitlePath: string[] | null;
  testFile: string | null;
  testLine: string | null;
  testColumn: string | null;
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

type ViewportRow = {
  viewportWidth: string | null;
  viewportHeight: string | null;
};

/**
 * Distinct viewport sizes formatted as "width×height", ordered from smallest
 * to largest area (mobile → desktop).
 */
function distinctViewports(rows: ViewportRow[]): string[] {
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
 * The full path of a test ("Suite › nested › case"), matching how tests are
 * displayed in screenshot metadata, falling back to its leaf title.
 */
function getTestName(row: {
  testTitlePath: string[] | null;
  testTitle: string | null;
}): string | null {
  // `titlePath` comes from JSON metadata (jsonb `->`), so guard against a
  // malformed non-array value before treating it as one.
  if (Array.isArray(row.testTitlePath) && row.testTitlePath.length > 0) {
    const joined = row.testTitlePath
      .filter((title): title is string => typeof title === "string")
      .map((title) => title.trim())
      .filter(Boolean)
      .join(" › ");
    if (joined) {
      return joined;
    }
  }
  return row.testTitle;
}

/**
 * Aggregate affected tests by their full path, keeping each test's source
 * location (from the first row that carries one) so the UI can link back to it.
 */
function countTests(rows: AffectedRow[]): BuildImpactItem[] {
  const tests = new Map<string, BuildImpactItem>();
  for (const row of rows) {
    const name = getTestName(row);
    if (name === null) {
      continue;
    }
    const existing = tests.get(name);
    if (existing) {
      existing.count++;
      existing.location ??= parseLocation(row);
    } else {
      tests.set(name, {
        name,
        count: 1,
        location: parseLocation(row),
      });
    }
  }
  return Array.from(tests.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Build a location from an affected row, or null when it lacks a usable one. */
function parseLocation(row: AffectedRow): ImpactItemLocation | null {
  if (row.testFile === null || row.testLine === null) {
    return null;
  }
  // `line`/`column` come from JSON metadata, so a non-numeric value would yield
  // NaN and break the non-null GraphQL Int fields — drop the location instead.
  const line = Number(row.testLine);
  if (!Number.isFinite(line)) {
    return null;
  }
  const column = Number(row.testColumn);
  return {
    file: row.testFile,
    line,
    column: Number.isFinite(column) ? column : 0,
  };
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
  const [changedRows, affectedRows, bucketRows, compareBucket] =
    await Promise.all([
      ScreenshotDiff.query()
        .where("screenshot_diffs.buildId", build.id)
        .whereNotNull("screenshot_diffs.baseScreenshotId")
        .whereNotNull("screenshot_diffs.compareScreenshotId")
        .where("screenshot_diffs.score", ">", 0)
        .where("screenshot_diffs.ignored", false)
        .joinRelated("compareScreenshot")
        .select(
          "screenshot_diffs.group",
          "screenshot_diffs.score",
          raw(`"compareScreenshot"."name"`).as("name"),
          raw(`"compareScreenshot"."metadata"->'browser'->>'name'`).as(
            "browser",
          ),
          raw(`"compareScreenshot"."metadata"->>'colorScheme'`).as(
            "colorScheme",
          ),
          raw(`"compareScreenshot"."metadata"->'viewport'->>'width'`).as(
            "viewportWidth",
          ),
          raw(`"compareScreenshot"."metadata"->'viewport'->>'height'`).as(
            "viewportHeight",
          ),
          raw(`"compareScreenshot"."metadata"->'story'->>'id'`).as("storyId"),
          raw(`"compareScreenshot"."metadata"->'test'->>'title'`).as(
            "testTitle",
          ),
          raw(`"compareScreenshot"."metadata"->'test'->'titlePath'`).as(
            "testTitlePath",
          ),
        )
        .castTo<ChangedRow[]>(),
      // Components/tests impacted by the build's changes: modified ("changed")
      // and brand-new ("added") screenshots. Added screenshots have no base, so
      // they're excluded from `changedRows`, but they still affect their
      // component/test. Failures and retried failures also lack a base, but they
      // are test failures rather than visual changes to review — so, like
      // removed, unchanged and ignored diffs, they must not be counted here.
      ScreenshotDiff.query()
        .where("screenshot_diffs.buildId", build.id)
        .joinRelated("compareScreenshot")
        .whereIn(raw(ScreenshotDiff.selectDiffStatus), ["added", "changed"])
        .select(
          raw(`"compareScreenshot"."metadata"->'story'->>'id'`).as("storyId"),
          raw(`"compareScreenshot"."metadata"->'test'->>'title'`).as(
            "testTitle",
          ),
          raw(`"compareScreenshot"."metadata"->'test'->'titlePath'`).as(
            "testTitlePath",
          ),
          raw(`"compareScreenshot"."metadata"->'test'->'location'->>'file'`).as(
            "testFile",
          ),
          raw(`"compareScreenshot"."metadata"->'test'->'location'->>'line'`).as(
            "testLine",
          ),
          raw(
            `"compareScreenshot"."metadata"->'test'->'location'->>'column'`,
          ).as("testColumn"),
        )
        .castTo<AffectedRow[]>(),
      Screenshot.query()
        .where("screenshotBucketId", build.compareScreenshotBucketId)
        .distinct(
          raw(`"metadata"->'browser'->>'name'`).as("browser"),
          raw(`"metadata"->>'colorScheme'`).as("colorScheme"),
          raw(`"metadata"->'viewport'->>'width'`).as("viewportWidth"),
          raw(`"metadata"->'viewport'->>'height'`).as("viewportHeight"),
          raw(`"metadata"->'automationLibrary'->>'name'`).as(
            "automationLibrary",
          ),
        )
        .castTo<BucketRow[]>(),
      ScreenshotBucket.query().findById(build.compareScreenshotBucketId),
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

  // The single most-changed entity, used to convey the build's severity at a
  // glance. Prefer the component, fall back to the test, then the raw name.
  let largestChange: BuildImpactChange | null = null;
  for (const row of changedRows) {
    const score = row.score === null ? 0 : Number(row.score);
    if (largestChange && score <= largestChange.score) {
      continue;
    }
    const name =
      (row.storyId ? getStoryComponent(row.storyId) : null) ??
      getTestName(row) ??
      row.name;
    if (name) {
      largestChange = { name, score };
    }
  }

  // Changes whose fingerprint was already approved on a previous build: they
  // let the reviewer collapse the perceived scope ("N already approved").
  const previouslyApprovedCount = compareBucket
    ? (await getPreviousDiffApprovalIds({ build, compareBucket })).length
    : 0;

  const affectedStoryIds = affectedRows.map((row) => row.storyId);

  return {
    changedCount: changedRows.length,
    uniqueChangeCount: groups.size + ungroupedCount,
    changedBrowsers: distinct(changedRows.map((row) => row.browser)),
    buildBrowsers: distinct(bucketRows.map((row) => row.browser)),
    changedColorSchemes: distinct(changedRows.map((row) => row.colorScheme)),
    buildColorSchemes: distinct(bucketRows.map((row) => row.colorScheme)),
    changedViewports: distinctViewports(changedRows),
    buildViewports: distinctViewports(bucketRows),
    largestChange,
    previouslyApprovedCount,
    buildAutomationLibraries: distinct(
      bucketRows.map((row) => row.automationLibrary),
    ),
    affectedComponents: countByName(
      affectedStoryIds.map((storyId) =>
        storyId !== null ? getStoryComponent(storyId) : null,
      ),
    ),
    affectedStories: countByName(affectedStoryIds),
    affectedTests: countTests(affectedRows),
  };
}
