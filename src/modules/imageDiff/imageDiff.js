import imageDiffRaw from 'image-diff'

// Generate an image diff result.
//
// We have been benchmarking other libraries, they are way too slow
// https://github.com/mapbox/pixelmatch
// https://github.com/gemini-testing/looks-same
//
// Some documentation
// https://en.wikipedia.org/wiki/Color_difference
function imageDiff({ compareScreenshotPath, baseScreenshotPath, diffResultPath }) {
  return new Promise((resolve, reject) => {
    imageDiffRaw.getFullResult(
      {
        actualImage: compareScreenshotPath,
        expectedImage: baseScreenshotPath,
        diffImage: diffResultPath,
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })
}

export default imageDiff
