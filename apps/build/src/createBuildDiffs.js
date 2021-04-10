import { transaction } from '@argos-ci/database'
import { ScreenshotDiff } from '@argos-ci/database/models'
import { baseCompare } from './baseCompare'

async function getOrCreateBaseScreenshotBucket(build, { trx } = {}) {
  // It can already be present, for instance by the sample build feature.
  if (build.baseScreenshotBucket) {
    return build.baseScreenshotBucket
  }
  const baseScreenshotBucket = await baseCompare({
    baseCommit: build.repository.baselineBranch,
    compareCommit: build.compareScreenshotBucket.commit,
    build,
    trx,
  })
  if (baseScreenshotBucket) {
    await build
      .$query(trx)
      .patch({ baseScreenshotBucketId: baseScreenshotBucket.id })
    return baseScreenshotBucket.$query(trx).withGraphFetched('screenshots')
  }
  return null
}

function getJobStatus({ compareWithBaseline, baseScreenshot }) {
  if (compareWithBaseline) return 'complete'
  if (!baseScreenshot) return 'complete'
  return 'pending'
}

export async function createBuildDiffs(build) {
  return transaction(async (trx) => {
    const richBuild = await build
      .$query(trx)
      .withGraphFetched(
        '[repository, baseScreenshotBucket.screenshots, compareScreenshotBucket.screenshots]',
      )

    const baseScreenshotBucket = await getOrCreateBaseScreenshotBucket(
      richBuild,
      { trx },
    )

    const compareWithBaseline =
      baseScreenshotBucket &&
      baseScreenshotBucket.commit === richBuild.compareScreenshotBucket.commit
    const sameBucket =
      baseScreenshotBucket &&
      baseScreenshotBucket.id === richBuild.compareScreenshotBucket.id

    const inserts = richBuild.compareScreenshotBucket.screenshots.map(
      (compareScreenshot) => {
        const baseScreenshot =
          !sameBucket && baseScreenshotBucket
            ? baseScreenshotBucket.screenshots.find(
                ({ name }) => name === compareScreenshot.name,
              )
            : null

        return {
          buildId: richBuild.id,
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
