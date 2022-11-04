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
  actualFilename,
  expectedFilename,
  diffFilename,
  fuzz = "10%",
}: {
  actualFilename: string;
  expectedFilename: string;
  diffFilename: string;
  fuzz?: string | number;
}) => {
  const difference = await imageDifference({
    actualFilename,
    expectedFilename,
    diffFilename,
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
