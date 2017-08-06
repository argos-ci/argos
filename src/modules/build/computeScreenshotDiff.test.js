import S3 from 'aws-sdk/clients/s3'
import path from 'path'
import config from 'config'
import { useDatabase, setTestsTimeout } from 'server/test/utils'
import factory from 'server/test/factory'
import { VALIDATION_STATUS } from 'server/constants'
import * as notifications from 'modules/build/notifications'
import upload from 'modules/s3/upload'
import computeScreenshotDiff from './computeScreenshotDiff'

jest.mock('modules/build/notifications')

describe('computeScreenshotDiff', () => {
  useDatabase()
  setTestsTimeout(10e3)

  let s3
  let baseBucket
  let build
  let compareBucket
  let screenshotDiff

  beforeAll(async () => {
    notifications.pushBuildNotification = jest.fn()
    s3 = new S3({ signatureVersion: 'v4' })
    await upload({
      s3,
      Bucket: config.get('s3.screenshotsBucket'),
      Key: 'penelope.jpg',
      inputPath: path.join(__dirname, '__fixtures__', 'penelope.jpg'),
    })
    await upload({
      s3,
      Bucket: config.get('s3.screenshotsBucket'),
      Key: 'penelope-argos.jpg',
      inputPath: path.join(__dirname, '__fixtures__', 'penelope-argos.jpg'),
    })
  })

  beforeEach(async () => {
    const repository = await factory.create('Repository', {
      enabled: true,
      token: 'xx',
    })
    compareBucket = await factory.create('ScreenshotBucket', {
      name: 'test-bucket',
      branch: 'test-branch',
      repositoryId: repository.id,
    })
    baseBucket = await factory.create('ScreenshotBucket', {
      name: 'base-bucket',
      branch: 'master',
      repositoryId: repository.id,
    })
    build = await factory.create('Build', {
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
    })
  })

  describe('with two different screenshots', () => {
    beforeEach(async () => {
      const compareScreenshot = await factory.create('Screenshot', {
        name: 'penelope',
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
        validationStatus: VALIDATION_STATUS.unknown,
      })
    })

    it('should update result and notify "diff-detected"', async () => {
      await computeScreenshotDiff(screenshotDiff, {
        s3,
        bucket: config.get('s3.screenshotsBucket'),
      })

      await screenshotDiff.reload()
      expect(screenshotDiff.score > 0).toBe(true)
      expect(typeof screenshotDiff.s3Id === 'string').toBe(true)
      expect(notifications.pushBuildNotification).toBeCalledWith({
        buildId: build.id,
        type: 'diff-detected',
      })
    })
  })

  describe('with two same screenshots', () => {
    beforeEach(async () => {
      const compareScreenshot = await factory.create('Screenshot', {
        name: 'penelope',
        s3Id: 'penelope.jpg',
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
        validationStatus: VALIDATION_STATUS.unknown,
      })
    })

    it('should not update result and notify "no-diff-detected"', async () => {
      await computeScreenshotDiff(screenshotDiff, {
        s3,
        bucket: config.get('s3.screenshotsBucket'),
      })

      await screenshotDiff.reload()
      expect(screenshotDiff.score).toBe(0)
      expect(screenshotDiff.s3Id).toBe(null)
      expect(notifications.pushBuildNotification).toBeCalledWith({
        buildId: build.id,
        type: 'no-diff-detected',
      })
    })
  })
})
