import path from 'path'
import fs from 'mz/fs'
import imageDiff from 'modules/imageDiff/imageDiff'

/**
 * Generate a images paths.
 *
 * @param {string} imagePath
 * @param {object} options
 * @param {object} options.compareScreenshotsPath Actual images path
 * @param {object} options.baseScreenshotsPath Expected images path
 * @param {object} options.diffResultPath Diff images path
 * @returns {Promise.<null|object>} diff Null if actual image doesn't exist, else diff
 * @returns {diff.compareScreenshotPath} Actual image path
 * @returns {diff.baseScreenshotPath} Expected image path
 * @returns {diff.diffResultPath} Diff image path
 */
async function generateImagePaths(imagePath, {
  compareScreenshotsPath,
  baseScreenshotsPath,
  diffResultsPath,
}) {
  const diff = {
    compareScreenshotPath: path.join(compareScreenshotsPath, imagePath),
    baseScreenshotPath: path.join(baseScreenshotsPath, imagePath),
    diffResultPath: path.join(diffResultsPath, imagePath),
  }

  if (!await fs.exists(diff.compareScreenshotPath)) {
    return null
  }

  return diff
}

/**
 * Generate a report.
 *
 * @param {object} options
 * @param {object} options.compareScreenshotsPath Actual images path
 * @param {object} options.baseScreenshotsPath Expected images path
 * @param {object} options.diffResultPath Diff images path
 * @returns {Promise.<object>} Report
 */
async function generateReport(options) {
  const baseScreenshotsPaths = await fs.readdir(options.baseScreenshotsPath)

  return Promise.all(baseScreenshotsPaths.map(path => generateImagePaths(path, options)))
    .then(paths =>
      Promise.all(paths.map(paths => imageDiff(paths))),
    )
}

export default generateReport
