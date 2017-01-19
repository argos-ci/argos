import path from 'path'
import fs from 'mz/fs'
import multipleDiffs from './multipleDiffs'

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
  const diffs = []

  for (const image of images) {
    const diff = await generateDiff(image, options)
    if (diff) {
      diffs.push(diff)
    }
  }

  return await multipleDiffs(diffs)
}

export default generateManifest
