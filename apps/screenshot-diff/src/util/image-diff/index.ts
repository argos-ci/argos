import type { S3Image } from "@argos-ci/storage";

import imageDifference from "./imageDifference.js";

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference
export const diffImages = async ({
  baseImage,
  compareImage,
  diffImage,
  fuzz = "10%",
}: {
  baseImage: S3Image;
  compareImage: S3Image;
  diffImage: S3Image;
  fuzz?: string | number;
}) => {
  const difference = await imageDifference({
    baseImage,
    compareImage,
    diffImage,
    fuzz,
  });

  const score = difference.value / (difference.width * difference.height);

  return {
    score: score < 0.00003 ? 0 : score,
    pixels: difference.value,
    scoreRaw: score,
    width: difference.width,
    height: difference.height,
  };
};
