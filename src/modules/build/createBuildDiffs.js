import { transaction } from 'objection'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import { VALIDATION_STATUS } from 'server/models/constant'
import { pushBuildNotification } from 'modules/build/notifications'

async function createBuildDiffs(build) {
  await pushBuildNotification({
    buildId: build.id,
    type: 'progress',
  })

  build = await build.$query().eager(
    '[baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]',
  )

  if (!build.baseScreenshotBucket) {
    return []
  }

  return transaction(ScreenshotDiff, function (ScreenshotDiff) {
    const diffInserts = build.compareScreenshotBucket.screenshots
      .reduce((diffInserts, compareScreenshot) => {
        const baseScreenshot = build.baseScreenshotBucket.screenshots
          .find(({ name }) => name === compareScreenshot.name)

        if (!baseScreenshot) {
          return diffInserts
        }

        diffInserts.push(ScreenshotDiff.query().insert({
          buildId: build.id,
          baseScreenshotId: baseScreenshot.id,
          compareScreenshotId: compareScreenshot.id,
          jobStatus: 'pending',
          validationStatus: VALIDATION_STATUS.unknown,
        }))

        return diffInserts
      }, [])

    return Promise.all(diffInserts)
  })
}

export default createBuildDiffs
