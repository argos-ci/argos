import S3 from 'aws-sdk/clients/s3'
import { useDatabase, setTestsTimeout } from 'server/test/utils'
import factory from 'server/test/factory'
import computeScreenshotDiff from './computeScreenshotDiff'

jest.mock('modules/build/notifyStatus')
const { notifyFailure } = require('modules/build/notifyStatus')

describe('computeScreenshotDiff', () => {
  useDatabase()
  setTestsTimeout(10000)

  let build
  let s3
  let screenshotDiff

  beforeEach(async () => {
    s3 = new S3({ signatureVersion: 'v4' })

    const repository = await factory.create('Repository', {
      enabled: true,
      token: 'xx',
    })
    const compareBucket = await factory.create('ScreenshotBucket', {
      name: 'test-bucket',
      branch: 'test-branch',
      repositoryId: repository.id,
    })
    const baseBucket = await factory.create('ScreenshotBucket', {
      name: 'base-bucket',
      branch: 'master',
      repositoryId: repository.id,
    })
    build = await factory.create('Build', {
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
    })
    const compareScreenshot = await factory.create('Screenshot', {
      name: 'penelope-argos',
      s3Id: 'penelope-argos.jpg',
      screenshotBucketId: compareBucket.id,
    })
    const baseScreenshot = await factory.create('Screenshot', {
      name: 'penelope',
      s3Id: 'penelope.jpg',
      screenshotBucketId: baseBucket.id,
    })
    screenshotDiff = await factory.create('ScreenshotDiff', {
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      jobStatus: 'pending',
      validationStatus: 'unknown',
    })
  })

  it('should process diff an update screenshot diff', async () => {
    await computeScreenshotDiff(screenshotDiff, {
      s3,
      bucket: 'argos-screenshots-sandbox',
    })

    await screenshotDiff.reload()
    expect(screenshotDiff.score > 0).toBeTruthy()
    expect(screenshotDiff.s3Id).not.toBeUndefined()
    expect(screenshotDiff.s3Id).not.toBeNull()
    expect(notifyFailure).toBeCalledWith(build.id)
  })
})
