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
    score: difference.value < 0.00005 ? 0 : difference.value,
    width: difference.width,
    height: difference.height,
    filepath: difference.filepath,
  };
};
