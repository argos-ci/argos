import { compare } from "odiff-bin";

import { tmpName, type Dimensions, type ImageHandle } from "@/storage";

import type { DiffOptions, DiffResult } from "../types";

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference

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

/**
 * Compute the diff between two images and returns the score.
 */
async function computeDiff(args: {
  basePath: string;
  headPath: string;
  diffPath: string;
  threshold: number;
}): Promise<number> {
  const result = await compare(args.basePath, args.headPath, args.diffPath, {
    outputDiffMask: true,
    threshold: args.threshold,
    antialiasing: true,
  });

  if (result.match) {
    return 0;
  }

  switch (result.reason) {
    case "file-not-exists":
      throw new Error("File not exists");
    case "layout-diff":
      return 1;
    case "pixel-diff":
      return result.diffPercentage / 100;
    default:
      throw new Error("Unknown reason");
  }
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
 * Get the maximum dimensions of a list of images.
 */
async function getMaxDimensions(...images: ImageHandle[]) {
  const imagesDimensions = await Promise.all(
    images.map(async (image) => image.getDimensions()),
  );

  const width = Math.max(...imagesDimensions.map(({ width }) => width));
  const height = Math.max(...imagesDimensions.map(({ height }) => height));

  const nbPixels = width * height;

  // If the orientation is portrait, we will use the default maximum width.
  if (nbPixels > MAX_PIXELS && width < height) {
    return fitIntoMaxPixels({
      width: DEFAULT_MAX_WIDTH,
      height: Math.floor(MAX_PIXELS / DEFAULT_MAX_WIDTH),
    });
  }

  return fitIntoMaxPixels({ width, height });
}

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
  console.log(size);
  return size;
}

/**
 * The default threshold for the diff.
 */
const DEFAULT_THRESHOLD = 0.5;

/**
 * Compute the difference between two images.
 */
export async function diffImages(
  base: ImageHandle,
  head: ImageHandle,
  options: DiffOptions,
): Promise<DiffResult> {
  const { threshold = DEFAULT_THRESHOLD } = options;
  // Get dimensions and diff paths
  const [maxDimensions, baseDiffPath, colorDiffPath] = await Promise.all([
    getMaxDimensions(base, head),
    tmpName({ postfix: ".png" }),
    tmpName({ postfix: ".png" }),
  ]);

  // Resize images to the maximum dimensions (sequentially to avoid memory issues)
  const basePath = await base.enlarge(maxDimensions);
  const headPath = await head.enlarge(maxDimensions);

  const diffConfig = getConfiguration(threshold);

  // Compute diffs (sequentially to avoid memory issues)
  const baseScore = await computeDiff({
    basePath,
    headPath,
    diffPath: baseDiffPath,
    threshold: diffConfig.baseThreshold,
  });
  const colorSensitiveScore = await computeDiff({
    basePath,
    headPath,
    diffPath: colorDiffPath,
    threshold: diffConfig.colorSensitiveThreshold,
  });

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
