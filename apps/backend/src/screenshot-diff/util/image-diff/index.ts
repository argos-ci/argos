/* eslint-disable import/namespace */
import { compare } from "odiff-bin";

import { tmpName } from "@/storage/index.js";
import type { ImageFile } from "@/storage/index.js";

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
 * Compute the diff between two images and returns the score.
 */
const computeDiff = async (args: {
  basePath: string;
  comparePath: string;
  diffPath: string;
  threshold: number;
}): Promise<number> => {
  const result = await compare(args.basePath, args.comparePath, args.diffPath, {
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
};

/**
 * Get the maximum dimensions of a list of images.
 */
async function getMaxDimensions(...images: ImageFile[]) {
  const imagesDimensions = await Promise.all(
    images.map(async (image) => image.getDimensions()),
  );

  return {
    width: Math.max(...imagesDimensions.map(({ width }) => width)),
    height: Math.max(...imagesDimensions.map(({ height }) => height)),
  };
}

/**
 * Compute the difference between two images.
 * Returns null if the difference is not significant.
 * Returns the diff image path and the score otherwise.
 */
export async function diffImages(
  baseImage: ImageFile,
  compareImage: ImageFile,
): Promise<null | {
  filepath: string;
  score: number;
  width: number;
  height: number;
}> {
  // Get dimensions and diff paths
  const [maxDimensions, baseDiffPath, colorDiffPath] = await Promise.all([
    getMaxDimensions(baseImage, compareImage),
    tmpName({ postfix: ".png" }),
    tmpName({ postfix: ".png" }),
  ]);

  // Resize images to the maximum dimensions
  const [basePath, comparePath] = await Promise.all([
    baseImage.enlarge(maxDimensions),
    compareImage.enlarge(maxDimensions),
  ]);

  // Compute diff sequentiall to avoid memory issues
  const baseScore = await computeDiff({
    basePath,
    comparePath,
    diffPath: baseDiffPath,
    threshold: BASE_THRESHOLD,
  });
  const colorSensitiveScore = await computeDiff({
    basePath,
    comparePath,
    diffPath: colorDiffPath,
    threshold: COLOR_SENSIBLE_THRESHOLD,
  });

  const maxBaseScore = Math.min(
    BASE_MAX_SCORE,
    MAXIMUM_PIXELS_TO_IGNORE / (maxDimensions.width * maxDimensions.height),
  );
  const adjustedBaseScore = baseScore < maxBaseScore ? 0 : baseScore;

  const adjustedSensitiveScore =
    colorSensitiveScore < COLOR_SENSIBLE_MAX_SCORE ? 0 : colorSensitiveScore;

  if (adjustedBaseScore > 0 && adjustedBaseScore > adjustedSensitiveScore) {
    return {
      ...maxDimensions,
      filepath: baseDiffPath,
      score: adjustedBaseScore,
    };
  }

  if (
    adjustedSensitiveScore > 0 &&
    adjustedSensitiveScore > adjustedBaseScore
  ) {
    return {
      ...maxDimensions,
      filepath: colorDiffPath,
      score: adjustedSensitiveScore,
    };
  }

  return null;
}
