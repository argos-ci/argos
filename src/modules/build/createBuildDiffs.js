import { transaction } from 'objection'
import Build from 'server/models/Build'
import ScreenshotDiff from 'server/models/ScreenshotDiff'

async function createBuildDiffs(buildId) {
  const build = await Build
    .query()
    .findById(buildId)
    .eager('[baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]')

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
          validationStatus: 'unknown',
        }))

        return diffInserts
      }, [])

    return Promise.all(diffInserts)
  })
}

export default createBuildDiffs
