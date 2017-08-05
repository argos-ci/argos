import path from 'path'
import tmp from 'tmp'
import { promisify } from 'util'
import { rmdir, unlink } from 'fs'
import download from 'modules/s3/download'
import upload from 'modules/s3/upload'
import imageDifference from 'modules/imageDifference/imageDifference'
import Build from 'server/models/Build'
import { pushBuildNotification } from 'modules/build/notifications'

const rmdirAsync = promisify(rmdir)
const unlinkAsync = promisify(unlink)

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

async function computeScreenshotDiff(screenshotDiff, { s3, bucket }) {
  screenshotDiff = await screenshotDiff.$query().eager('[build, baseScreenshot, compareScreenshot]')

  if (!screenshotDiff) {
    throw new Error(`Screenshot diff id: \`${screenshotDiff}\` not found`)
  }

  const tmpDir = await createTmpDirectory()
  const baseScreenshotPath = path.join(tmpDir, 'base')
  const compareScreenshotPath = path.join(tmpDir, 'compare')
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

  const difference = await imageDifference({
    compareScreenshotPath,
    baseScreenshotPath,
    diffResultPath,
  })

  let uploadResult = null
  if (difference.score > 0) {
    uploadResult = await upload({
      s3,
      bucket,
      inputPath: diffResultPath,
    })
  }

  await Promise.all([
    unlinkAsync(compareScreenshotPath),
    unlinkAsync(baseScreenshotPath),
    unlinkAsync(diffResultPath),
  ])

  await rmdirAsync(tmpDir)

  await screenshotDiff.$query().patch({
    score: difference.score,
    jobStatus: 'complete',
    s3Id: uploadResult ? uploadResult.Key : null,
  })

  const buildStatus = await Build.getStatus(screenshotDiff.build)

  if (buildStatus === 'success') {
    await pushBuildNotification({
      buildId: screenshotDiff.buildId,
      type: 'no-diff-detected',
    })
  } else if (buildStatus === 'failure') {
    await pushBuildNotification({
      buildId: screenshotDiff.buildId,
      type: 'diff-detected',
    })
  }
}

export default computeScreenshotDiff
