import { Build, ScreenshotBucket } from '@argos-ci/database/models'
import { job as buildJob } from '@argos-ci/build'

const sampleScreenshots = {
  base: [
    {
      s3Id: 'base-ListItem-PrimaryActionCheckboxListItem.png',
      name: 'ListItem/PrimaryActionCheckboxListItem.png',
    },
    {
      s3Id: 'base-patient-mobile-profile.png',
      name: 'patient_mobile_profile.png',
    },
    {
      s3Id: 'base-ListItem-IconListItem.png',
      name: 'ListItem/IconListItem.png',
    },
  ],
  compare: [
    {
      s3Id: 'compare-ListItem-PrimaryActionCheckboxListItem.png',
      name: 'ListItem/PrimaryActionCheckboxListItem.png',
    },
    {
      s3Id: 'compare-patient-mobile-profile.png',
      name: 'patient_mobile_profile.png',
    },
    {
      s3Id: 'compare-ListItem-IconListItem.png',
      name: 'ListItem/IconListItem.png',
    },
  ],
}

export async function generateSample(repositoryId) {
  const build = await Build.transaction(async trx => {
    const baseScreenshotBucket = await ScreenshotBucket.query(trx).insert({
      name: 'default',
      commit: '7c854111d458d5848bff6c0f3b065b58bc28f160',
      branch: 'argos-ci-integration',
      repositoryId,
    })
    await baseScreenshotBucket.$relatedQuery('screenshots', trx).insert(
      sampleScreenshots.base.map(screenshot => ({
        screenshotBucketId: baseScreenshotBucket.id,
        ...screenshot,
      })),
    )
    const compareScreenshotBucket = await ScreenshotBucket.query().insert({
      name: 'default',
      commit: 'a60b931a9ef036b8c6b4dbef09a652911542a494',
      branch: 'argos-ci-integration',
      repositoryId,
    })
    await compareScreenshotBucket.$relatedQuery('screenshots', trx).insert(
      sampleScreenshots.compare.map(screenshot => ({
        screenshotBucketId: compareScreenshotBucket.id,
        ...screenshot,
      })),
    )

    const build = Build.query(trx).insert({
      baseScreenshotBucketId: baseScreenshotBucket.id,
      compareScreenshotBucketId: compareScreenshotBucket.id,
      repositoryId,
      number: 0,
      jobStatus: 'pending',
    })
    return build
  })
  await buildJob.push(build.id)
}
