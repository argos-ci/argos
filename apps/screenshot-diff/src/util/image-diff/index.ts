import type { ImageFile } from "@argos-ci/storage";

import imageDifference from "./imageDifference.js";

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference

// On 100x100 images we want to ignore 5 pixels, so:
// $nbPixels = 100 * 100
// $nbPixelsToIgnore = 2
// $maxScore = $nbPixelsToIgnore / $nbPixels
// $maxScore = 2 / (100 * 100)
// $maxScore = 0.0002
const MAXIMUM_SCORE = 0.0002;

// We want to ignore a maximum of 20 pixels whatever the image size is:
const MAXIMUM_PIXELS_TO_IGNORE = 20;

export const diffImages = async ({
  baseImage,
  compareImage,
}: {
  baseImage: ImageFile;
  compareImage: ImageFile;
}) => {
  const difference = await imageDifference({
    baseImage,
    compareImage,
  });

  return {
    score:
      difference.value <
      Math.min(
        MAXIMUM_SCORE,
        MAXIMUM_PIXELS_TO_IGNORE / (difference.width * difference.height),
      )
        ? 0
        : difference.value,
    width: difference.width,
    height: difference.height,
    filepath: difference.filepath,
  };
};
