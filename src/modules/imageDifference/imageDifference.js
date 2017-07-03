import imageDifferenceRaw from 'image-difference'

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference
async function imageDifference({ compareScreenshotPath, baseScreenshotPath, diffResultPath }) {
  const difference = await imageDifferenceRaw({
    actualFilename: compareScreenshotPath,
    expectedFilename: baseScreenshotPath,
    diffFilename: diffResultPath,
    fuzz: 18 ** 2, // Small threshold to remove imperceptible changes.
  })

  return {
    // Accept up to 5 unequal pixels.
    score: difference.value < 5 ? 0 : difference.value / (difference.width * difference.height),
  }
}

export default imageDifference
