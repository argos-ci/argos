import imageDifference from 'image-difference'

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference
export async function diffImages({
  actualFilename,
  expectedFilename,
  diffFilename,
  fuzz = '10%',
}) {
  const difference = await imageDifference({
    actualFilename,
    expectedFilename,
    diffFilename,
    fuzz,
  })

  const score = difference.value / (difference.width * difference.height)

  return {
    score: score < 0.00003 ? 0 : score,
    pixels: difference.value,
    scoreRaw: score,
  }
}
