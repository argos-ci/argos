import imageDifferenceRaw from 'image-difference'

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference
async function imageDifference({
  compareScreenshotPath,
  baseScreenshotPath,
  diffResultPath,
  fuzz = 30 ** 2, // Small threshold to remove imperceptible changes.
}) {
  const difference = await imageDifferenceRaw({
    actualFilename: compareScreenshotPath,
    expectedFilename: baseScreenshotPath,
    diffFilename: diffResultPath,
    fuzz,
  })

  const score = difference.value / (difference.width * difference.height)

  return {
    score: score < 0.00003 ? 0 : score,
    pixels: difference.value,
    scoreRaw: score,
  }
}

export default imageDifference
