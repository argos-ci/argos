import { transaction } from 'objection'
import baseCompare from 'modules/baseCompare/baseCompare'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import { VALIDATION_STATUS } from 'server/constants'

async function createBuildDiffs(build) {
  build = await build
    .$query()
    .eager('[repository, baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]')

  let newBaseScreenshotBucket

  // We need a baseScreenshotBucket to move forward.
  // However, it can already be present, for instance
  // by the sample build feature.
  if (!build.baseScreenshotBucket) {
    newBaseScreenshotBucket = await baseCompare({
      baseCommit: build.repository.baselineBranch,
      compareCommit: build.compareScreenshotBucket.commit,
      build,
    })
  }

  return transaction(ScreenshotDiff, async ScreenshotDiff => {
    if (newBaseScreenshotBucket) {
      await build.$query().patch({ baseScreenshotBucketId: newBaseScreenshotBucket.id })
      build.baseScreenshotBucket = await newBaseScreenshotBucket.$query().eager('screenshots')
    }

    const compareWithBaseline =
      build.compareScreenshotBucket.branch === build.repository.baselineBranch

    // At some point, we should handle baseScreenshots no longer in the compareScreenshots.
    const diffInserts = build.compareScreenshotBucket.screenshots.reduce(
      (diffInserts, compareScreenshot) => {
        const baseScreenshot = build.baseScreenshotBucket
          ? build.baseScreenshotBucket.screenshots.find(
              ({ name }) => name === compareScreenshot.name
            )
          : null

        if (!baseScreenshot) {
          diffInserts.push(
            ScreenshotDiff.query().insert({
              buildId: build.id,
              baseScreenshotId: null,
              compareScreenshotId: compareScreenshot.id,
              jobStatus: 'complete',
              validationStatus: VALIDATION_STATUS.unknown,
            })
          )

          return diffInserts
        }

        diffInserts.push(
          ScreenshotDiff.query().insert({
            buildId: build.id,
            baseScreenshotId: baseScreenshot.id,
            compareScreenshotId: compareScreenshot.id,
            jobStatus: compareWithBaseline ? 'complete' : 'pending',
            validationStatus: VALIDATION_STATUS.unknown,
          })
        )

        return diffInserts
      },
      []
    )

    return Promise.all(diffInserts)
  })
}

// Solve jest mocking issue with async.
// Wait for https://github.com/facebook/jest/pull/3209 to be released
export default (...args) => createBuildDiffs(...args)
