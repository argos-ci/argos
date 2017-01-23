import path from 'path'
import fs from 'mz/fs'
import multipleDiffs from 'modules/imageDiff/multipleDiffs'

async function generateDiff(imagePath, {
  actualImagesPath,
  expectedImagesPath,
  diffImagesPath,
}) {
  const diff = {
    actualImage: path.join(actualImagesPath, imagePath),
    expectedImage: path.join(expectedImagesPath, imagePath),
    diffImage: path.join(diffImagesPath, imagePath),
  }

  if (!await fs.exists(diff.actualImage)) {
    return null
  }

  return diff
}

async function generateManifest(options) {
  const images = await fs.readdir(options.expectedImagesPath)
  const diffs = images.map(image => generateDiff(image, options))

  return Promise
    .all(diffs)
    .then((diffs) => {
      return multipleDiffs(diffs.filter(diff => diff))
    })
}

export default generateManifest
