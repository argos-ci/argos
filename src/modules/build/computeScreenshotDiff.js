import path from 'path'
import tmp from 'tmp'
import fs from 'mz/fs'
import download from 'modules/s3/download'
import imageDiff from 'modules/imageDiff/imageDiff'
import ScreenshotDiff from 'server/models/ScreenshotDiff'

function createTmpDirectory() {
  return new Promise((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) {
        reject(err)
      } else {
        resolve(path)
      }
    })
  })
}

async function computeScreenshotDiff(screenshotDiffId, { s3, bucket }) {
  if (!screenshotDiffId) {
    throw new Error(`Invalid screenshot diff id: ${screenshotDiffId}`)
  }

  const screenshotDiff = await ScreenshotDiff.query()
    .findById(screenshotDiffId)
    .eager('[baseScreenshot, compareScreenshot]')

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`)
  }

  await screenshotDiff.$query().patch({ jobStatus: 'progress' })

  const tmpDir = await createTmpDirectory()
  const baseScreenshotPath = path.join(tmpDir, 'base')
  const compareScreenshotPath = path.join(tmpDir, 'compare')
  const diffResultPath = path.join(tmpDir, 'diff')

  await Promise.all([
    download({
      s3,
      bucket,
      fileKey: screenshotDiff.baseScreenshot.s3Id,
      outputPath: baseScreenshotPath,
    }),
    download({
      s3,
      bucket,
      fileKey: screenshotDiff.compareScreenshot.s3Id,
      outputPath: compareScreenshotPath,
    }),
  ])

  const diffResult = await imageDiff({
    compareScreenshotPath,
    baseScreenshotPath,
    diffResultPath,
  })

  // TODO upload diff result image to s3 and save it in database

  await Promise.all([
    fs.unlink(compareScreenshotPath),
    fs.unlink(baseScreenshotPath),
    fs.unlink(diffResultPath),
  ])

  await fs.rmdir(tmpDir)

  await screenshotDiff.$query().patch({
    score: diffResult.percentage,
    jobStatus: 'complete',
  })

  return screenshotDiff
}

export default computeScreenshotDiff
