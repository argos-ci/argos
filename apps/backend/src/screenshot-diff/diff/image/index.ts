import { diffScreenshots } from "@argos-ci/mask-fingerprint";
import * as Sentry from "@sentry/node";

import { tmpName, type Dimensions, type ImageHandle } from "@/storage";

import type { DiffOptions, DiffResult } from "../types";

// The pixel comparison runs in @argos-ci/mask-fingerprint (Rust, N-API):
// both images are decoded once, the two thresholds are evaluated in a single
// pass, and layout-shift compensation realigns rows in memory before the
// diff. See https://en.wikipedia.org/wiki/Color_difference for the YIQ
// distance used by the pixelmatch algorithm.

// On 100x100 images we want to ignore 2 pixels, so:
// $nbPixels = 100 * 100
// $nbPixelsToIgnore = 2
// $maxScore = $nbPixelsToIgnore / $nbPixels
// $maxScore = 2 / (100 * 100)
// $maxScore = 0.0002

// We compute two diffs:
// - one with a high threshold to avoid antialiasing issues
// - one with a low threshold to avoid color issues

const BASE_THRESHOLD = 0.15;
const BASE_MAX_SCORE = 0.0002;
const MAXIMUM_PIXELS_TO_IGNORE = 20;

const COLOR_SENSIBLE_THRESHOLD = 0.0225;
const COLOR_SENSIBLE_MAX_SCORE = 0.03; // 3% of image is different

/**
 * Get the configuration for the diff.
 * The threshold is a number between 0 and 1.
 * The higher the threshold, the less sensitive the diff will be.
 * The default threshold is 0.5.
 * A threshold of 0 is 100% strict.
 */
function getConfiguration(threshold: number) {
  // The default threshold is 0.5. By multipliying it by 2, we make it 1 by default.
  const relativeThreshold = threshold * 2;
  return {
    baseThreshold: BASE_THRESHOLD * relativeThreshold,
    baseMaxScore: BASE_MAX_SCORE * relativeThreshold,
    maximumPixelsToIgnore: MAXIMUM_PIXELS_TO_IGNORE * relativeThreshold,
    colorSensitiveThreshold: COLOR_SENSIBLE_THRESHOLD * relativeThreshold,
    colorSensitiveMaxScore: COLOR_SENSIBLE_MAX_SCORE * relativeThreshold,
  };
}

type DiffConfiguration = ReturnType<typeof getConfiguration>;

/**
 * The default threshold for the diff.
 */
const DEFAULT_THRESHOLD = 0.5;

/**
 * odiff reported its diff percentage rounded to two decimals, so diffs under
 * 0.005% of the image were treated as a perfect match. Scores are quantized
 * the same way to keep historical behavior.
 */
function quantizeScore(score: number) {
  return Math.round(score * 10_000) / 10_000;
}

/**
 * Layout-shift compensation settings (see mask-fingerprint for semantics).
 */
const LAYOUT_SHIFT_OPTIONS = {
  /** Minimum consecutive matching rows to accept an equal segment. */
  minRun: 16,
  /** Minimum fraction of matched rows for the alignment to be trusted. */
  minEqualCoverage: 0.3,
  /** Maximum number of alignment segments. */
  maxSegments: 32,
  /** Minimum classic score to attempt alignment when heights are equal. */
  minClassicScore: 0.05,
  /** The aligned residual score must be below classic * ratio. */
  maxResidualRatio: 0.5,
};

/**
 * Apply threshold gates to both diff scores and pick the resulting diff
 * (score + mask file).
 */
function selectDiffResult(args: {
  baseScore: number;
  colorSensitiveScore: number;
  baseDiffPath: string;
  colorDiffPath: string;
  diffConfig: DiffConfiguration;
  maxDimensions: Dimensions;
}): DiffResult {
  const {
    baseScore,
    colorSensitiveScore,
    baseDiffPath,
    colorDiffPath,
    diffConfig,
    maxDimensions,
  } = args;

  const maxBaseScore = Math.min(
    diffConfig.baseMaxScore,
    diffConfig.maximumPixelsToIgnore /
      (maxDimensions.width * maxDimensions.height),
  );
  const adjustedBaseScore = baseScore < maxBaseScore ? 0 : baseScore;

  const adjustedSensitiveScore =
    colorSensitiveScore < diffConfig.colorSensitiveMaxScore
      ? 0
      : colorSensitiveScore;

  if (adjustedBaseScore > 0 && adjustedBaseScore >= adjustedSensitiveScore) {
    return {
      score: adjustedBaseScore,
      file: {
        path: baseDiffPath,
        contentType: "image/png",
        ...maxDimensions,
      },
    };
  }

  if (
    adjustedSensitiveScore > 0 &&
    adjustedSensitiveScore > adjustedBaseScore
  ) {
    return {
      score: adjustedSensitiveScore,
      file: {
        path: colorDiffPath,
        contentType: "image/png",
        ...maxDimensions,
      },
    };
  }

  return { score: 0 };
}

/**
 * Maximum number of pixels allowed in a screenshot.
 */
const MAX_PIXELS = 80_000_000;

/**
 * Default maximum width of a screenshot.
 * Used when the width or height of the image is not available.
 */
const DEFAULT_MAX_WIDTH = 2048;

/**
 * Make the image scale into the allowed limit of pixels.
 */
function fitIntoMaxPixels(size: Dimensions) {
  const nbPixels = size.width * size.height;
  if (nbPixels > MAX_PIXELS) {
    const scaleFactor = Math.sqrt(MAX_PIXELS / nbPixels);
    return {
      width: Math.floor(size.width * scaleFactor),
      height: Math.floor(size.height * scaleFactor),
    };
  }
  return size;
}

/**
 * Resolve the file paths to compare. Same-width images are compared as-is:
 * the diff pads the shorter one with transparency, and row alignment works
 * on unpadded rows. When widths differ, the smaller image is scaled to fit
 * the largest dimensions (historical behavior).
 */
async function resolveComparablePaths(
  base: ImageHandle,
  head: ImageHandle,
): Promise<[string, string]> {
  const [baseDimensions, headDimensions] = await Promise.all([
    base.getDimensions(),
    head.getDimensions(),
  ]);

  if (baseDimensions.width === headDimensions.width) {
    return Promise.all([base.getFilepath(), head.getFilepath()]);
  }

  const width = Math.max(baseDimensions.width, headDimensions.width);
  const height = Math.max(baseDimensions.height, headDimensions.height);
  const nbPixels = width * height;

  // If the orientation is portrait, we will use the default maximum width.
  const maxDimensions =
    nbPixels > MAX_PIXELS && width < height
      ? fitIntoMaxPixels({
          width: DEFAULT_MAX_WIDTH,
          height: Math.floor(MAX_PIXELS / DEFAULT_MAX_WIDTH),
        })
      : fitIntoMaxPixels({ width, height });

  // Resize images to the maximum dimensions (sequentially to avoid memory issues)
  const basePath = await base.enlarge(maxDimensions);
  const headPath = await head.enlarge(maxDimensions);
  return [basePath, headPath];
}

/**
 * Compute the difference between two images.
 */
export async function diffImages(
  base: ImageHandle,
  head: ImageHandle,
  options: DiffOptions,
): Promise<DiffResult> {
  return Sentry.startSpan(
    {
      name: "diffImages",
      attributes: {
        "argos.diff.threshold": options.threshold ?? DEFAULT_THRESHOLD,
      },
    },
    async () => {
      const { threshold = DEFAULT_THRESHOLD } = options;
      const diffConfig = getConfiguration(threshold);

      const [basePath, headPath] = await resolveComparablePaths(base, head);
      const [baseDiffPath, colorDiffPath] = await Promise.all([
        tmpName({ postfix: ".png" }),
        tmpName({ postfix: ".png" }),
      ]);

      const result = await Sentry.startSpan({ name: "diffScreenshots" }, () =>
        diffScreenshots(basePath, headPath, {
          baseThreshold: diffConfig.baseThreshold,
          colorThreshold: diffConfig.colorSensitiveThreshold,
          baseDiffPath,
          colorDiffPath,
          layoutShift: LAYOUT_SHIFT_OPTIONS,
        }),
      );

      const maxDimensions = { width: result.width, height: result.height };

      const picked = selectDiffResult({
        baseScore: quantizeScore(result.baseScore),
        colorSensitiveScore: quantizeScore(result.colorScore),
        baseDiffPath,
        colorDiffPath,
        diffConfig,
        maxDimensions,
      });

      if (!result.layoutShiftApplied) {
        return picked;
      }

      // Inserted rows diff to zero against the realigned base and deleted
      // rows have no head coordinates: both are counted explicitly on top of
      // the residual pixel score. The mask is already painted accordingly.
      const shiftFraction =
        (result.insertedRows + result.deletedRows) / result.height;
      const score = Math.min(picked.score + shiftFraction, 1);

      if (score === 0) {
        return { score: 0 };
      }

      // When the residual pixel diff is below the gates, the painted mask
      // still exists (the base mask is always written on layout shift).
      const file = picked.file ?? {
        path: baseDiffPath,
        contentType: "image/png",
        ...maxDimensions,
      };

      return { score, file };
    },
  );
}
