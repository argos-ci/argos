import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import createBuildDiffs from './createBuildDiffs'

jest.mock('modules/build/notifications')
const { pushBuildNotification } = require('modules/build/notifications')

describe('createBuildDiffs', () => {
  useDatabase()

  let build
  let compareBucket
  let baseBucket
  let compareScreenshot
  let baseScreenshot

  beforeEach(async () => {
    const repository = await factory.create('Repository', {
      enabled: true,
    })
    compareBucket = await factory.create('ScreenshotBucket', {
      repositoryId: repository.id,
    })
    baseBucket = await factory.create('ScreenshotBucket', {
      repositoryId: repository.id,
    })
    build = await factory.create('Build', {
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
      jobStatus: 'pending',
    })
    compareScreenshot = await factory.create('Screenshot', {
      name: 'a',
      s3Id: 'a',
      screenshotBucketId: compareBucket.id,
    })
    await factory.create('Screenshot', {
      name: 'b',
      s3Id: 'b',
      screenshotBucketId: compareBucket.id,
    })
    baseScreenshot = await factory.create('Screenshot', {
      name: 'a',
      s3Id: 'a',
      screenshotBucketId: baseBucket.id,
    })
  })

  it('should return the build', async () => {
    const diffs = await createBuildDiffs(build)
    expect(pushBuildNotification).toBeCalledWith({
      buildId: build.id,
      type: 'progress',
    })
    expect(diffs[0].buildId).toBe(build.id)
    expect(diffs[0].baseScreenshotId).toBe(baseScreenshot.id)
    expect(diffs[0].compareScreenshotId).toBe(compareScreenshot.id)
    expect(diffs[0].jobStatus).toBe('pending')
    expect(diffs[0].validationStatus).toBe('unknown')
  })
})
