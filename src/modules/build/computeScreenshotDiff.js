import path from 'path'
import tmp from 'tmp'
import fs from 'mz/fs'
import download from 'modules/s3/download'
import upload from 'modules/s3/upload'
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
  const baseScreenshotPath = path.join(tmpDir, screenshotDiff.baseScreenshot.s3Id)
  const compareScreenshotPath = path.join(tmpDir, screenshotDiff.compareScreenshot.s3Id)
  const diffResultPath = path.join(tmpDir, 'diff.png')

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

  const uploadResult = await upload({
    s3,
    bucket,
    inputPath: diffResultPath,
  })

  await Promise.all([
    fs.unlink(compareScreenshotPath),
    fs.unlink(baseScreenshotPath),
    fs.unlink(diffResultPath),
  ])

  await fs.rmdir(tmpDir)

  await screenshotDiff.$query().patch({
    score: diffResult.percentage,
    jobStatus: 'complete',
    s3Id: uploadResult.Key,
  })

  return screenshotDiff
}

export default computeScreenshotDiff
