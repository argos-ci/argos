import { sortBy } from 'lodash'
import * as notifications from '@argos-ci/build-notification'
import { useDatabase, factory } from '@argos-ci/database/testing'
import { ScreenshotDiff } from '@argos-ci/database/models'
import { createBuildDiffs } from './createBuildDiffs'

jest.mock('@argos-ci/build-notification')

describe('#createBuildDiffs', () => {
  useDatabase()

  beforeAll(() => {
    notifications.pushBuildNotification = jest.fn()
  })

  let build
  let compareBucket
  let baseBucket
  let compareScreenshot1
  let baseScreenshot
  let repository

  beforeEach(async () => {
    repository = await factory.create('Repository', {
      enabled: true,
    })
    compareBucket = await factory.create('ScreenshotBucket', {
      branch: 'BUGS-123',
      repositoryId: repository.id,
    })
    build = await factory.create('Build', {
      baseScreenshotBucketId: null,
      compareScreenshotBucketId: compareBucket.id,
      repositoryId: repository.id,
      jobStatus: 'pending',
    })
    compareScreenshot1 = await factory.create('Screenshot', {
      name: 'b',
      s3Id: 'b',
      screenshotBucketId: compareBucket.id,
    })
  })

  describe('with existing ScreenshotBucket', () => {
    let compareScreenshot2

    beforeEach(async () => {
      baseBucket = await factory.create('ScreenshotBucket', {
        branch: 'master',
        repositoryId: repository.id,
      })
      baseScreenshot = await factory.create('Screenshot', {
        name: 'a',
        s3Id: 'a',
        screenshotBucketId: baseBucket.id,
      })
      compareScreenshot2 = await factory.create('Screenshot', {
        name: 'a',
        s3Id: 'a',
        screenshotBucketId: compareBucket.id,
      })
    })

    it('should return the build', async () => {
      const diffs = sortBy(await createBuildDiffs(build), diff =>
        Number(diff.baseScreenshotId),
      )
      expect(diffs.length).toBe(2)
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot1.id,
        jobStatus: 'complete',
        validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
      })
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot2.id,
        jobStatus: 'pending',
        validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
      })
    })

    it('should not run the diff when comparing the base branch against itself', async () => {
      await compareBucket.$query().patch({ commit: baseBucket.commit })
      const diffs = sortBy(await createBuildDiffs(build), diff =>
        Number(diff.baseScreenshotId),
      )
      expect(diffs.length).toBe(2)
      expect(diffs[0]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: compareScreenshot1.id,
        jobStatus: 'complete',
        validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
      })
      expect(diffs[1]).toMatchObject({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot2.id,
        jobStatus: 'complete',
        validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
      })
    })
  })

  it('should work with a first build', async () => {
    const diffs = await createBuildDiffs(build)
    expect(diffs.length).toBe(1)
    expect(diffs[0]).toMatchObject({
      buildId: build.id,
      baseScreenshotId: null,
      compareScreenshotId: compareScreenshot1.id,
      jobStatus: 'complete',
      validationStatus: ScreenshotDiff.VALIDATION_STATUSES.unknown,
    })
  })
})
