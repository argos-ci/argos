import ScreenshotBucket from 'server/models/ScreenshotBucket'
import Build from 'server/models/Build'

async function createBuild(screenshotBucketId) {
  if (!screenshotBucketId) {
    throw new Error(`Invalid screenshot bucket id: ${screenshotBucketId}`)
  }

  const compareScreenshotBucket = await ScreenshotBucket.query().findById(screenshotBucketId)

  if (!compareScreenshotBucket) {
    throw new Error(`Bucket id: \`${screenshotBucketId}\` not found`)
  }

  const baseScreenshotBucket = await compareScreenshotBucket.baseScreenshotBucket()

  return Build.query()
    .insert({
      baseScreenshotBucketId: baseScreenshotBucket.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
    })
}

export default createBuild
