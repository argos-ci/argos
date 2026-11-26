import { createHash } from "node:crypto";
import {
  getVariantSignature,
  groupWalkableJourneys,
  type Journey,
  type JourneyMetadata,
} from "@argos/schemas/journey";
import { checkStatusNeedsReview } from "@argos/schemas/screenshot-diff-status";
import { invariant } from "@argos/util/invariant";
import { raw } from "objection";

import { ScreenshotDiff, type Build } from "@/database/models";
import { getVariantKey } from "@/graphql/services/variant-key";

import { parseLocation } from "./impact-analysis";

type Viewport = { width: number; height: number };

/**
 * A journey at one viewport or color scheme: its screens, walked one after the
 * other, and what a summary of it shows. Only ids, so that a build with
 * thousands of screens does not send each one with its journeys.
 * @graphqlType
 */
export type BuildJourneyVariant = {
  viewport: Viewport | null;
  browser: string | null;
  colorScheme: "light" | "dark" | null;
  /** Its screenshot of each step of the journey, null for a step it lacks. */
  diffIds: (string | null)[];
  changedDiffIds: string[];
  /** The first screen that changed, or the first one when none did. */
  coverDiffId: string;
};

/**
 * A run of a test that captures several screens, the way a review walks it.
 * `@argos/schemas/journey` says what makes a journey and a step.
 */
export type BuildJourney = {
  id: string;
  prefix: string;
  title: string;
  location: { file: string; line: number; column: number } | null;
  /** The journey's screens in capture order, by the key their variants share. */
  stepKeys: string[];
  variants: BuildJourneyVariant[];
};

type JourneyRow = ScreenshotDiff & {
  name: string;
  metadataTestId: string | null;
  testTitlePath: unknown;
  storyId: string | null;
  captureIndex: string | null;
  browser: string | null;
  colorScheme: string | null;
  viewportWidth: string | null;
  viewportHeight: string | null;
  testFile: string | null;
  testLine: string | null;
  testColumn: string | null;
  testRetry: string | null;
  testRetries: string | null;
};

// The build page reads a removed screenshot's metadata on its baseline, and
// every other one on the screenshot taken in the build, even when it has none.
const METADATA = `(CASE WHEN "screenshot_diffs"."compareScreenshotId" IS NULL THEN "baseScreenshot"."metadata" ELSE "compareScreenshot"."metadata" END)`;

function getJourneyMetadata(row: JourneyRow): JourneyMetadata {
  // `titlePath` comes from JSON metadata, so guard against a malformed value.
  const titlePath = Array.isArray(row.testTitlePath)
    ? row.testTitlePath.filter(
        (title): title is string => typeof title === "string",
      )
    : null;
  const captureIndex = Number(row.captureIndex ?? NaN);
  return {
    test: titlePath ? { id: row.metadataTestId, titlePath } : null,
    story: row.storyId ? { id: row.storyId } : null,
    capture: Number.isFinite(captureIndex) ? { index: captureIndex } : null,
  };
}

function parseNumber(value: string | null): number | null {
  const number = Number(value ?? NaN);
  return Number.isFinite(number) ? number : null;
}

function parseViewport(row: JourneyRow): Viewport | null {
  const width = Number(row.viewportWidth ?? NaN);
  const height = Number(row.viewportHeight ?? NaN);
  return Number.isFinite(width) && Number.isFinite(height)
    ? { width, height }
    : null;
}

/**
 * The journey key holds the whole title path, too long for a URL. A hash of
 * it names the journey there instead: eight characters keep the journeys of a
 * build apart.
 */
function getJourneyId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

type JourneyItem = {
  row: JourneyRow;
  name: string;
  variantKey: string;
  /** What tells the variants of a step apart. */
  signature: string;
  metadata: JourneyMetadata;
};

function parseColorScheme(row: JourneyRow): "light" | "dark" | null {
  return row.colorScheme === "light" || row.colorScheme === "dark"
    ? row.colorScheme
    : null;
}

/** The variants of a journey, in the order a review walks them. */
function getVariants(
  steps: Journey<JourneyItem>["steps"],
  checkNeedsReview: (item: JourneyItem) => boolean,
): BuildJourneyVariant[] {
  const variants = new Map<string, (JourneyItem | null)[]>();
  steps.forEach((step, index) => {
    for (const item of step.diffs) {
      const byStep =
        variants.get(item.signature) ??
        steps.map((): JourneyItem | null => null);
      variants.set(item.signature, byStep);
      byStep[index] = item;
    }
  });
  return Array.from(variants.values(), (byStep) => {
    const items = byStep.filter((item) => item !== null);
    const [first] = items;
    invariant(first, "a variant has a screen");
    const changed = items.filter(checkNeedsReview);
    const [cover = first] = changed;
    return {
      viewport: parseViewport(first.row),
      browser: first.row.browser,
      colorScheme: parseColorScheme(first.row),
      diffIds: byStep.map((item) => item?.row.id ?? null),
      changedDiffIds: changed.map((item) => item.row.id),
      coverDiffId: cover.row.id,
    };
  });
}

function getLocation(steps: Journey<JourneyItem>["steps"]) {
  for (const step of steps) {
    for (const item of step.diffs) {
      const location = parseLocation(item.row);
      if (location) {
        return location;
      }
    }
  }
  return null;
}

function toBuildJourney(
  { identity, steps }: Journey<JourneyItem>,
  checkNeedsReview: (item: JourneyItem) => boolean,
): BuildJourney {
  return {
    id: getJourneyId(identity.key),
    prefix: identity.prefix,
    title: identity.title,
    location: getLocation(steps),
    stepKeys: steps.map((step) => step.key),
    variants: getVariants(steps, checkNeedsReview),
  };
}

function getStatus(row: JourneyRow) {
  return ScreenshotDiff.getDiffStatus(
    row,
    row.compareScreenshotId && !row.baseScreenshotId
      ? {
          name: row.name,
          retry: parseNumber(row.testRetry),
          retries: parseNumber(row.testRetries),
        }
      : null,
  );
}

/** The journeys of a build, with their steps in capture order. */
export async function getBuildJourneys(build: Build): Promise<BuildJourney[]> {
  const rows = await ScreenshotDiff.query()
    .where("screenshot_diffs.buildId", build.id)
    .leftJoinRelated("[baseScreenshot, compareScreenshot]")
    // A file attached to a screenshot (an ARIA snapshot) is listed under it,
    // it is not a screen of its own.
    .whereNull("compareScreenshot.parentName")
    // Only end-to-end tests make journeys; an empty story id is no story.
    .whereRaw(`${METADATA}->'test'->'titlePath' IS NOT NULL`)
    .whereRaw(`nullif(${METADATA}->'story'->>'id', '') IS NULL`)
    .select(
      "screenshot_diffs.id",
      "screenshot_diffs.baseScreenshotId",
      "screenshot_diffs.compareScreenshotId",
      "screenshot_diffs.score",
      "screenshot_diffs.ignored",
      raw(
        `coalesce(nullif("compareScreenshot"."name", ''), "baseScreenshot"."name")`,
      ).as("name"),
      raw(`${METADATA}->'test'->>'id'`).as("metadataTestId"),
      raw(`${METADATA}->'test'->'titlePath'`).as("testTitlePath"),
      raw(`${METADATA}->'story'->>'id'`).as("storyId"),
      raw(`${METADATA}->'capture'->>'index'`).as("captureIndex"),
      raw(`${METADATA}->'browser'->>'name'`).as("browser"),
      raw(`${METADATA}->>'colorScheme'`).as("colorScheme"),
      raw(`${METADATA}->'viewport'->>'width'`).as("viewportWidth"),
      raw(`${METADATA}->'viewport'->>'height'`).as("viewportHeight"),
      raw(`${METADATA}->'test'->'location'->>'file'`).as("testFile"),
      raw(`${METADATA}->'test'->'location'->>'line'`).as("testLine"),
      raw(`${METADATA}->'test'->'location'->>'column'`).as("testColumn"),
      raw(`"compareScreenshot"."metadata"->'test'->>'retry'`).as("testRetry"),
      raw(`"compareScreenshot"."metadata"->'test'->>'retries'`).as(
        "testRetries",
      ),
    )
    .orderBy("screenshot_diffs.id")
    .castTo<JourneyRow[]>();

  const items = rows.map((row): JourneyItem => {
    const variantKey = getVariantKey(row.name);
    return {
      row,
      name: row.name,
      variantKey,
      signature: getVariantSignature({ name: row.name, variantKey }),
      metadata: getJourneyMetadata(row),
    };
  });
  const checkNeedsReview = (item: JourneyItem) =>
    checkStatusNeedsReview(getStatus(item.row), {
      isSubsetBuild: build.subset,
    });
  return groupWalkableJourneys(items, (item) => item.metadata).map((journey) =>
    toBuildJourney(journey, checkNeedsReview),
  );
}
