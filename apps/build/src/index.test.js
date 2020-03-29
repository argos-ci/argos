import * as notifications from '@argos-ci/build-notification'
import { job as screenshotDiffJob } from '@argos-ci/screenshot-diff'
import { useDatabase, factory } from '@argos-ci/database/testing'
import { createBuildDiffs } from './createBuildDiffs'
import { performBuild } from './index'

jest.mock('@argos-ci/build-notification')
jest.mock('@argos-ci/screenshot-diff')
jest.mock('./createBuildDiffs')

describe('build', () => {
  useDatabase()

  beforeEach(() => {
    notifications.pushBuildNotification = jest.fn()
    screenshotDiffJob.push = jest.fn()
  })

  describe('performBuild', () => {
    let build
    let repository
    let compareBucket
    let Screenshot1

    beforeEach(async () => {
      repository = await factory.create('Repository', {
        enabled: true,
      })
      compareBucket = await factory.create('ScreenshotBucket', {
        repositoryId: repository.id,
      })
      build = await factory.create('Build', {
        baseScreenshotBucketId: null,
        compareScreenshotBucketId: compareBucket.id,
        repositoryId: repository.id,
        jobStatus: 'pending',
      })
      Screenshot1 = await factory.create('Screenshot', {
        name: 'b',
        screenshotBucketId: compareBucket.id,
      })
    })

    it('should work with the second build', async () => {
      const baseBucket = await factory.create('ScreenshotBucket', {
        repositoryId: repository.id,
      })

      createBuildDiffs.mockImplementation(async () => {
        const screenshot21 = await factory.create('Screenshot', {
          name: 'a',
          screenshotBucketId: baseBucket.id,
        })
        const screenshot22 = await factory.create('Screenshot', {
          name: 'a',
          screenshotBucketId: compareBucket.id,
        })
        const ScreenshotDiff1 = await factory.create('ScreenshotDiff', {
          buildId: build.id,
          baseScreenshotId: null,
          compareScreenshotId: Screenshot1.id,
          jobStatus: 'complete',
          validationStatus: 'unknown',
        })
        const ScreenshotDiff2 = await factory.create('ScreenshotDiff', {
          buildId: build.id,
          baseScreenshotId: screenshot21.id,
          compareScreenshotId: screenshot22.id,
          jobStatus: 'pending',
          validationStatus: 'unknown',
        })

        return [ScreenshotDiff1, ScreenshotDiff2]
      })

      await performBuild(build)

      expect(notifications.pushBuildNotification).toBeCalledWith({
        buildId: build.id,
        type: 'progress',
      })
      expect(notifications.pushBuildNotification.mock.calls.length).toBe(1)
      expect(screenshotDiffJob.push.mock.calls.length).toBe(1)
    })

    it('should work with the first build', async () => {
      createBuildDiffs.mockImplementation(async () => {
        const ScreenshotDiff1 = await factory.create('ScreenshotDiff', {
          buildId: build.id,
          baseScreenshotId: null,
          compareScreenshotId: Screenshot1.id,
          jobStatus: 'complete',
          validationStatus: 'unknown',
        })

        return [ScreenshotDiff1]
      })

      await performBuild(build)

      expect(notifications.pushBuildNotification).toBeCalledWith({
        buildId: build.id,
        type: 'progress',
      })
      expect(notifications.pushBuildNotification.mock.calls.length).toBe(2)
      expect(screenshotDiffJob.push.mock.calls.length).toBe(0)
    })
  })
})
