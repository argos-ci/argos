import { ScreenshotDiff } from '@argos-ci/database/models'
import { baseCompare } from './baseCompare'

async function getOrCreateBaseScreenshotBucket(build, trx) {
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
      .$query(trx)
      .patch({ baseScreenshotBucketId: baseScreenshotBucket.id })
    return baseScreenshotBucket.$query().withGraphFetched('screenshots')
  }
  return null
}

function getJobStatus({ compareWithBaseline, baseScreenshot }) {
  if (compareWithBaseline) return 'complete'
  if (!baseScreenshot) return 'complete'
  return 'pending'
}

export async function createBuildDiffs(build) {
  build = await build
    .$query()
    .withGraphFetched(
      '[repository, baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]',
    )

  return ScreenshotDiff.transaction(async trx => {
    const baseScreenshotBucket = await getOrCreateBaseScreenshotBucket(
      build,
      trx,
    )

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
          validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
        }
      },
      [],
    )

    return ScreenshotDiff.query(trx).insert(inserts)
  })
}
