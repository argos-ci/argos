import { transaction } from 'objection'
import baseCompare from 'modules/baseCompare/baseCompare'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import { VALIDATION_STATUS } from 'server/constants'

async function getOrCreateBaseScreenshotBucket(build) {
  // It can already be present, for instance by the sample build feature.
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket
  }
  const baseScreenshotBucket = await baseCompare({
    baseCommit: build.repository.baselineBranch,
    compareCommit: build.compareScreenshotBucket.commit,
    build,
  })
  if (baseScreenshotBucket) {
    await build
      .$query()
      .patch({ baseScreenshotBucketId: baseScreenshotBucket.id })
    return baseScreenshotBucket.$query().eager('screenshots')
  }
  return null
}

function getJobStatus({ compareWithBaseline, baseScreenshot }) {
  if (compareWithBaseline) return 'complete'
  if (!baseScreenshot) return 'complete'
  return 'pending'
}

export default async function createBuildDiffs(build) {
  build = await build
    .$query()
    .eager(
      '[repository, baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]',
    )

  return transaction(ScreenshotDiff, async ScreenshotDiff => {
    const baseScreenshotBucket = await getOrCreateBaseScreenshotBucket(build)

    const compareWithBaseline =
      baseScreenshotBucket &&
      baseScreenshotBucket.commit === build.compareScreenshotBucket.commit
    const sameBucket =
      baseScreenshotBucket &&
      baseScreenshotBucket.id === build.compareScreenshotBucket.id

    const inserts = build.compareScreenshotBucket.screenshots.map(
      compareScreenshot => {
        const baseScreenshot =
          !sameBucket && baseScreenshotBucket
            ? baseScreenshotBucket.screenshots.find(
                ({ name }) => name === compareScreenshot.name,
              )
            : null

        return {
          buildId: build.id,
          baseScreenshotId: baseScreenshot ? baseScreenshot.id : null,
          compareScreenshotId: compareScreenshot.id,
          jobStatus: getJobStatus({ compareWithBaseline, baseScreenshot }),
          validationStatus: VALIDATION_STATUS.unknown,
        }
      },
      [],
    )

    return ScreenshotDiff.query().insert(inserts)
  })
}
