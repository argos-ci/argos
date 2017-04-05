import { transaction } from 'objection'
import baseCompare from 'modules/baseCompare/baseCompare'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import Build from 'server/models/Build'
import { VALIDATION_STATUS } from 'server/models/constant'

async function createBuildDiffs(build) {
  build = await build.$query().eager(
    '[repository, baseScreenshotBucket, compareScreenshotBucket.screenshots]',
  )

  const baseScreenshotBucket = await baseCompare({
    baseCommit: build.repository.baselineBranch,
    compareCommit: build.compareScreenshotBucket.commit,
    build,
  })

  return transaction(ScreenshotDiff, Build, async (ScreenshotDiff, Build) => {
    if (baseScreenshotBucket) {
      build.baseScreenshotBucket = await baseScreenshotBucket.$query()
        .eager('screenshots')

      await Build.query()
        .patch({ baseScreenshotBucketId: baseScreenshotBucket.id })
        .where({ id: build.id })
    }

    // At some point, we should handle baseScreenshots no longer in the
    // compareScreenshots.
    const diffInserts = build.compareScreenshotBucket.screenshots
      .reduce((diffInserts, compareScreenshot) => {
        const baseScreenshot = build.baseScreenshotBucket ?
          build.baseScreenshotBucket.screenshots
            .find(({ name }) => name === compareScreenshot.name) :
          null

        if (!baseScreenshot) {
          diffInserts.push(ScreenshotDiff.query().insert({
            buildId: build.id,
            baseScreenshotId: null,
            compareScreenshotId: compareScreenshot.id,
            jobStatus: 'complete',
            validationStatus: VALIDATION_STATUS.unknown,
          }))

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

// Solve jest mocking issue with async.
// Wait for https://github.com/facebook/jest/pull/3209 to be released
export default (...args) => createBuildDiffs(...args)
