import { createHash } from "node:crypto";
import {
  groupWalkableJourneys,
  type Journey,
  type JourneyMetadata,
} from "@argos/schemas/journey";
import { raw } from "objection";

import { ScreenshotDiff, type Build } from "@/database/models";
import { getVariantKey } from "@/graphql/services/variant-key";

import { parseLocation } from "./impact-analysis";

/**
 * A screen of a journey, with the build's screenshots of it (its variants).
 * @graphqlType
 */
export type BuildJourneyStep = {
  key: string;
  diffIds: string[];
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
  browser: string | null;
  viewport: { width: number; height: number } | null;
  steps: BuildJourneyStep[];
};

type JourneyRow = {
  id: string;
  name: string;
  testId: string | null;
  testTitlePath: unknown;
  storyId: string | null;
  captureIndex: string | null;
  browser: string | null;
  viewportWidth: string | null;
  viewportHeight: string | null;
  testFile: string | null;
  testLine: string | null;
  testColumn: string | null;
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
    test: titlePath ? { id: row.testId, titlePath } : null,
    story: row.storyId ? { id: row.storyId } : null,
    capture: Number.isFinite(captureIndex) ? { index: captureIndex } : null,
  };
}

function parseViewport(row: JourneyRow | undefined): BuildJourney["viewport"] {
  const width = Number(row?.viewportWidth ?? NaN);
  const height = Number(row?.viewportHeight ?? NaN);
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
  variantKey: string;
  metadata: JourneyMetadata;
};

function toBuildJourney({
  identity,
  steps,
}: Journey<JourneyItem>): BuildJourney {
  const runRows = steps.flatMap((step) => step.diffs.map((item) => item.row));
  const [firstRow] = runRows;
  return {
    id: getJourneyId(identity.key),
    prefix: identity.prefix,
    title: identity.title,
    location:
      runRows.map(parseLocation).find((location) => location !== null) ?? null,
    browser: firstRow?.browser ?? null,
    viewport: parseViewport(firstRow),
    steps: steps.map((step) => ({
      key: step.key,
      diffIds: step.diffs.map((item) => item.row.id),
    })),
  };
}

/** The journeys of a build, with their steps in capture order. */
export async function getBuildJourneys(build: Build): Promise<BuildJourney[]> {
  const rows = await ScreenshotDiff.query()
    .where("screenshot_diffs.buildId", build.id)
    .leftJoinRelated("[baseScreenshot, compareScreenshot]")
    // A file attached to a screenshot (an ARIA snapshot) is listed under it,
    // it is not a screen of its own.
    .whereNull("compareScreenshot.parentName")
    .select(
      "screenshot_diffs.id",
      raw(
        `coalesce(nullif("compareScreenshot"."name", ''), "baseScreenshot"."name")`,
      ).as("name"),
      raw(`${METADATA}->'test'->>'id'`).as("testId"),
      raw(`${METADATA}->'test'->'titlePath'`).as("testTitlePath"),
      raw(`${METADATA}->'story'->>'id'`).as("storyId"),
      raw(`${METADATA}->'capture'->>'index'`).as("captureIndex"),
      raw(`${METADATA}->'browser'->>'name'`).as("browser"),
      raw(`${METADATA}->'viewport'->>'width'`).as("viewportWidth"),
      raw(`${METADATA}->'viewport'->>'height'`).as("viewportHeight"),
      raw(`${METADATA}->'test'->'location'->>'file'`).as("testFile"),
      raw(`${METADATA}->'test'->'location'->>'line'`).as("testLine"),
      raw(`${METADATA}->'test'->'location'->>'column'`).as("testColumn"),
    )
    .orderBy("screenshot_diffs.id")
    .castTo<JourneyRow[]>();

  const items = rows.map((row): JourneyItem => ({
    row,
    variantKey: getVariantKey(row.name),
    metadata: getJourneyMetadata(row),
  }));
  return groupWalkableJourneys(items, (item) => item.metadata).map(
    toBuildJourney,
  );
}
