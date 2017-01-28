import imageDiffRaw from 'image-diff'

/**
 * Generate an image diff result.
 *
 * @param {object} options
 * @param {string} options.compareScreenshotPath Actual image path
 * @param {string} options.baseScreenshotPath Expected image path
 * @param {string} options.diffResultPath Diff image path
 * @returns {Promise.<object>} result
 * @returns {number} result.total
 * @returns {number} result.percentage
 */
function imageDiff({
  compareScreenshotPath,
  baseScreenshotPath,
  diffResultPath,
}) {
  return new Promise((resolve, reject) => {
    imageDiffRaw.getFullResult({
      actualImage: compareScreenshotPath,
      expectedImage: baseScreenshotPath,
      diffImage: diffResultPath,
    }, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

export default imageDiff
