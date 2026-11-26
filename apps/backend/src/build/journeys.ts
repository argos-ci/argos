import { createHash } from "node:crypto";
import {
  getVariantSignature,
  groupWalkableJourneys,
  walkJourneySteps,
  type Journey,
  type JourneyMetadata,
} from "@argos/schemas/journey";
import { checkStatusNeedsReview } from "@argos/schemas/screenshot-diff-status";
import { invariant } from "@argos/util/invariant";
import { raw } from "objection";

import { Screenshot, ScreenshotDiff, type Build } from "@/database/models";
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
  browser: string | null;
  viewport: Viewport | null;
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

function parseViewport(row: JourneyRow | undefined): Viewport | null {
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
  name: string;
  variantKey: string;
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
  const signatures = new Set(walkJourneySteps(steps).map(getVariantSignature));
  return Array.from(signatures, (signature) => {
    const byStep = steps.map(
      (step) =>
        step.diffs.find((item) => getVariantSignature(item) === signature) ??
        null,
    );
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

function toBuildJourney(
  { identity, steps }: Journey<JourneyItem>,
  checkNeedsReview: (item: JourneyItem) => boolean,
): BuildJourney {
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
    stepKeys: steps.map((step) => step.key),
    variants: getVariants(steps, checkNeedsReview),
  };
}

/**
 * The status of each row, as the API gives it. Only an added screenshot's
 * reads the screenshot itself: its name and retries tell a failure apart.
 */
async function getDiffStatuses(
  rows: JourneyRow[],
): Promise<Map<string, string>> {
  const addedIds = rows.flatMap((row) =>
    row.compareScreenshotId && !row.baseScreenshotId
      ? [row.compareScreenshotId]
      : [],
  );
  const added =
    addedIds.length > 0 ? await Screenshot.query().findByIds(addedIds) : [];
  const addedById = new Map(
    added.map((screenshot) => [screenshot.id, screenshot]),
  );
  const statuses = await Promise.all(
    rows.map(async (row) => {
      const status = await row.$getDiffStatus(async (id) => {
        const screenshot = addedById.get(id);
        invariant(screenshot, "Screenshot not found");
        return screenshot;
      });
      return [row.id, status] as const;
    }),
  );
  return new Map(statuses);
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
    )
    .orderBy("screenshot_diffs.id")
    .castTo<JourneyRow[]>();

  const items = rows.map((row): JourneyItem => ({
    row,
    name: row.name,
    variantKey: getVariantKey(row.name),
    metadata: getJourneyMetadata(row),
  }));
  const journeys = groupWalkableJourneys(items, (item) => item.metadata);
  const statuses = await getDiffStatuses(
    journeys.flatMap((journey) =>
      journey.steps.flatMap((step) => step.diffs.map((item) => item.row)),
    ),
  );
  const checkNeedsReview = (item: JourneyItem) => {
    const status = statuses.get(item.row.id);
    invariant(status, "every screen of a journey has a status");
    return checkStatusNeedsReview(status, { isSubsetBuild: build.subset });
  };
  return journeys.map((journey) => toBuildJourney(journey, checkNeedsReview));
}
